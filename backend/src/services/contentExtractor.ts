import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import { URL } from 'url';
import TurndownService from 'turndown';

export interface ExtractedContent {
  title?: string;
  description?: string;
  keywords?: string[];
  contentType: string;
  charset: string;
  language?: string;
  textContent: string;
  htmlContent: string;
  markdownContent?: string; // Clean Firecrawl-style markdown
  contentHash: string;
  extractedLinks: {
    internal: string[];
    external: string[];
  };
  images: {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    type: 'logo' | 'product' | 'content' | 'avatar' | 'icon' | 'unknown';
  }[];
  contentChunks: {
    type: 'article' | 'product' | 'listing' | 'table' | 'navigation' | 'footer' | 'sidebar' | 'unknown';
    selector: string;
    content: string;
    confidence: number;
  }[];
}

export class ContentExtractorService {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      preformattedCode: true
    });
    
    // Keep table structure intact
    this.turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);
    
    // Add custom rule to handle tables properly
    this.turndownService.addRule('tables', {
      filter: ['table'],
      replacement: (content, node) => {
        return '\n\n' + this.convertHtmlTableToMarkdown(node as HTMLElement) + '\n\n';
      }
    });
  }
  
  /**
   * Convert HTML table to clean Markdown table
   */
  private convertHtmlTableToMarkdown(tableElement: any): string {
    const $ = cheerio.load(tableElement.outerHTML || '');
    const rows: string[][] = [];
    
    // Extract table rows
    $('tr').each((_, tr) => {
      const row: string[] = [];
      $(tr).find('th, td').each((_, cell) => {
        row.push($(cell).text().trim().replace(/\n/g, ' '));
      });
      if (row.length > 0) {
        rows.push(row);
      }
    });
    
    if (rows.length === 0) return '';
    
    // Build markdown table
    const colCount = Math.max(...rows.map(r => r.length));
    let markdown = '';
    
    // Header row
    if (rows.length > 0) {
      markdown += '| ' + rows[0].map(cell => cell || ' ').join(' | ') + ' |\n';
      markdown += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
      
      // Data rows
      for (let i = 1; i < rows.length; i++) {
        markdown += '| ' + rows[i].map(cell => cell || ' ').join(' | ') + ' |\n';
      }
    }
    
    return markdown;
  }

  /**
   * Extract content from HTML
   */
  async extractContent(html: string, url: string, baseDomain: string): Promise<ExtractedContent> {
    const $ = cheerio.load(html);
    
    // Remove script and style tags
    $('script, style, noscript').remove();
    
    // Extract metadata
    const title = this.extractTitle($);
    const description = this.extractDescription($);
    const keywords = this.extractKeywords($);
    const language = this.extractLanguage($);
    
    // Extract text content
    const textContent = this.extractTextContent($);
    const htmlContent = $.html();
    
    // Generate content hash
    const contentHash = this.generateContentHash(textContent);
    
    // Extract links
    const extractedLinks = this.extractLinks($, url, baseDomain);
    
    // Extract images
    const images = this.extractImages($, url);
    
    // Extract content chunks
    const contentChunks = this.extractContentChunks($);
    
    // Extract clean markdown content (Firecrawl-style)
    const markdownContent = this.extractTextContent($);
    
    return {
      title,
      description,
      keywords,
      contentType: 'text/html',
      charset: 'utf-8',
      language,
      textContent,
      htmlContent,
      markdownContent, // Clean markdown content
      contentHash,
      extractedLinks,
      images,
      contentChunks
    };
  }

  /**
   * Extract page title
   */
  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try different title sources in order of preference
    const titleSources = [
      'title',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'h1'
    ];

    for (const selector of titleSources) {
      const element = $(selector).first();
      if (element.length) {
        const title = selector === 'title' || selector === 'h1' 
          ? element.text().trim()
          : element.attr('content')?.trim();
        
        if (title && title.length > 0) {
          return title;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract page description
   */
  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    const descriptionSources = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]'
    ];

    for (const selector of descriptionSources) {
      const content = $(selector).attr('content')?.trim();
      if (content && content.length > 0) {
        return content;
      }
    }

    return undefined;
  }

  /**
   * Extract keywords
   */
  private extractKeywords($: cheerio.CheerioAPI): string[] {
    const keywordsContent = $('meta[name="keywords"]').attr('content');
    if (keywordsContent) {
      return keywordsContent.split(',').map(k => k.trim()).filter(k => k.length > 0);
    }
    return [];
  }

  /**
   * Extract language
   */
  private extractLanguage($: cheerio.CheerioAPI): string | undefined {
    const lang = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');
    // Normalize language code to MongoDB-compatible format (e.g., 'en-US' -> 'en')
    if (lang) {
      return lang.split('-')[0].toLowerCase(); // Extract base language code
    }
    return lang;
  }

  /**
   * Extract clean markdown content (Firecrawl-style)
   * Intelligently isolates main article content and converts to structured markdown
   */
  private extractTextContent($: cheerio.CheerioAPI): string {
    // Create a working copy by loading the HTML again to avoid mutating the original
    const html = $.html();
    const $working = cheerio.load(html);
    
    // Step 1: Remove scripts, styles, and obvious non-content first
    $working('script, style, noscript, iframe, embed, object, svg').remove();
    
    // Step 2: Find the main content container intelligently (BEFORE aggressive removal)
    const mainContentElement = this.findMainContentContainer($working);
    
    if (!mainContentElement || mainContentElement.length === 0) {
      // Try density-based detection on less-cleaned DOM
      const densityResult = this.extractByDensity($working);
      return densityResult;
    }
    
    // Step 3: Now that we have main content, clean it up (remove nested noise)
    this.cleanContentElement($working, mainContentElement);
    
    // Step 4: Convert to markdown
    const htmlContent = mainContentElement.html() || '';
    
    if (htmlContent.length === 0) {
      return '';
    }
    
    const markdown = this.turndownService.turndown(htmlContent);
    
    // Step 5: Clean up markdown formatting
    const cleanedMarkdown = this.cleanMarkdown(markdown);
    return cleanedMarkdown;
  }

  /**
   * Remove all boilerplate elements (navigation, sidebars, footers, UI clutter)
   */
  private removeBoilerplate($: cheerio.CheerioAPI): void {
    // Remove script, style, and other non-content elements first
    $('script, style, noscript, iframe, embed, object, svg').remove();
    
    // Navigation elements (more comprehensive)
    const navSelectors = [
      'nav',
      'header',
      'header nav',
      '.navbar',
      '.navigation',
      '.nav',
      '.menu',
      '.main-menu',
      '.primary-menu',
      '.secondary-menu',
      '.breadcrumb',
      '.breadcrumbs',
      '[role="navigation"]',
      '[role="banner"]',
      '[aria-label*="navigation" i]',
      '[aria-label*="menu" i]',
      '[aria-label*="breadcrumb" i]',
      '[class*="nav" i]:not([class*="canvas" i])',
      '[id*="nav" i]',
      '[class*="header" i]',
      '[id*="header" i]'
    ];
    
    // Sidebar elements
    const sidebarSelectors = [
      'aside',
      '.sidebar',
      '.side-panel',
      '.widget-area',
      '.widget',
      '.sidebar-content',
      '[role="complementary"]',
      '[class*="sidebar" i]',
      '[id*="sidebar" i]',
      '[class*="widget" i]'
    ];
    
    // Footer elements (more comprehensive)
    const footerSelectors = [
      'footer',
      '.footer',
      '.page-footer',
      '.site-footer',
      '.footer-content',
      '[role="contentinfo"]',
      '[class*="footer" i]',
      '[id*="footer" i]',
      '[class*="copyright" i]'
    ];
    
    // UI Clutter (buttons, forms, etc.)
    const clutterSelectors = [
      'button',
      'a[href*="login"]',
      'a[href*="signup"]',
      'a[href*="register"]',
      '[class*="button" i]',
      '[class*="btn" i]',
      '[class*="suggest-edit" i]',
      '[class*="edit" i][class*="button" i]',
      '[class*="share" i]',
      '[class*="social" i]',
      '[class*="back-to-top" i]',
      '[class*="scroll-top" i]',
      'form',
      '.search-form',
      '.search-box',
      '[role="search"]',
      '.cookie-banner',
      '.cookie-consent',
      '.cookie-notice',
      '.popup',
      '.modal',
      '[class*="advertisement" i]',
      '[class*="ad-" i]',
      '[class*="ad_" i]',
      '[id*="ad-" i]',
      '[id*="ad_" i]',
      '.ads',
      '.ad',
      '[class*="sponsor" i]',
      '[class*="promo" i]',
      '[class*="banner" i]:not(.page-banner):not(.hero-banner)'
    ];
    
    // Remove all boilerplate
    const allSelectors = [
      ...navSelectors,
      ...sidebarSelectors,
      ...footerSelectors,
      ...clutterSelectors
    ];
    
    allSelectors.forEach(selector => {
      try {
        $(selector).remove();
      } catch (e) {
        // Ignore invalid selectors
      }
    });
    
    // Remove elements with common noise class patterns
    $('[class*="skip" i], [class*="hidden" i], [aria-hidden="true"]').remove();
    
    // Remove common metadata/utility elements
    $('[class*="metadata" i], [class*="meta-info" i], [class*="tags" i], [class*="categories" i]').remove();
    
    // Remove social media sharing buttons
    $('[class*="social-share" i], [class*="share-buttons" i]').remove();
    
    // Remove comments sections
    $('[class*="comment" i], [id*="comment" i], [class*="disqus" i]').remove();
    
    // Remove related/recommended content
    $('[class*="related" i], [class*="recommended" i], [class*="you-may-like" i]').remove();
  }

  /**
   * Find main content container using intelligent selector priority
   */
  private findMainContentContainer($: cheerio.CheerioAPI): cheerio.Cheerio<any> | null {
    // Priority 1: Semantic HTML5 elements
    const semanticSelectors = [
      'main',
      'article',
      '[role="main"]',
      '[role="article"]'
    ];
    
    for (const selector of semanticSelectors) {
      const element = $(selector).first();
      if (element.length && this.isSubstantialContent(element.text())) {
        return element;
      }
    }
    
    // Priority 2: Common content class/id patterns (expanded)
    const contentClassSelectors = [
      '#content',
      '#main',
      '#main-content',
      '#article',
      '#post',
      '#post-content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.article-body',
      '.content-body',
      '.main-content',
      '.primary-content',
      '.content',
      '.post',
      '.post-body',
      '.entry',
      '.entry-body',
      '[class*="post-content" i]',
      '[class*="article-content" i]',
      '[class*="content-body" i]',
      '[class*="main-content" i]',
      '[class*="primary-content" i]',
      '[class*="page-content" i]',
      '[itemprop="articleBody"]',
      '[itemprop="mainEntity"]'
    ];
    
    for (const selector of contentClassSelectors) {
      const element = $(selector).first();
      if (element.length && this.isSubstantialContent(element.text())) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Clean content element by removing any remaining noise
   */
  private cleanContentElement($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>): void {
    // Remove ONLY obvious nested navigation and sidebars (be conservative!)
    element.find('nav, aside, .sidebar, .widget-area').remove();
    
    // Remove ONLY explicit ad elements
    element.find('.ad, .advertisement, #ad, #advertisement, [id*="google_ads"]').remove();
    
    // Remove script and style tags that might have been added dynamically
    element.find('script, style, noscript').remove();
    
    // Remove ONLY explicitly named comment sections (not wildcard)
    element.find('#comments, .comments-area, .comment-section').remove();
  }

  /**
   * Extract content using density-based detection (fallback method)
   * Finds the element with most paragraphs and least link density
   */
  private extractByDensity($: cheerio.CheerioAPI): string {
    let bestElement: cheerio.Cheerio<any> | null = null;
    let bestScore = -1;
    
    // Check all div, section, and article elements
    $('div, section, article').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      
      // Skip if too short
      if (text.length < 200) return;
      
      // Calculate content density score
      const paragraphCount = $el.find('p').length;
      const linkCount = $el.find('a').length;
      const textLength = text.length;
      
      // Skip if too many links (likely navigation)
      const linkDensity = linkCount / Math.max(textLength / 100, 1);
      if (linkDensity > 0.5) return; // More than 50% links is likely navigation
      
      // Score = paragraph count * text length / link count (higher is better)
      const score = paragraphCount * textLength / Math.max(linkCount, 1);
      
      if (score > bestScore) {
        bestScore = score;
        bestElement = $el as cheerio.Cheerio<any>;
      }
    });
    
    if (bestElement !== null) {
      const element = bestElement as cheerio.Cheerio<any>;
      this.cleanContentElement($, element);
      const htmlContent = element.html() || '';
      const markdown = this.turndownService.turndown(htmlContent);
      return this.cleanMarkdown(markdown);
    }
    
    // Last resort: extract from body but clean it heavily
    const $body = $('body');
    this.cleanContentElement($, $body);
    const htmlContent = $body.html() || '';
    const markdown = this.turndownService.turndown(htmlContent);
    return this.cleanMarkdown(markdown);
  }

  /**
   * Clean and format markdown output
   */
  private cleanMarkdown(markdown: string): string {
    // Remove excessive blank lines (more than 2 consecutive)
    let cleaned = markdown.replace(/\n{3,}/g, '\n\n');
    
    // Remove leading/trailing whitespace from each line
    cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
    
    // Remove lines that are just whitespace or single characters
    cleaned = cleaned.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 1 || trimmed === '';
    }).join('\n');
    
    // Clean up list formatting
    cleaned = cleaned.replace(/\n- \n/g, '\n');
    cleaned = cleaned.replace(/\n\d+\. \n/g, '\n');
    
    // Remove markdown artifacts
    cleaned = cleaned.replace(/\[\[.*?\]\]/g, ''); // Remove wiki-style links
    cleaned = cleaned.replace(/<!--.*?-->/gs, ''); // Remove HTML comments
    
    // Final trim
    return cleaned.trim();
  }

  /**
   * Extract and categorize links
   */
  private extractLinks($: cheerio.CheerioAPI, currentUrl: string, baseDomain: string) {
    const internal: string[] = [];
    const external: string[] = [];
    const seenUrls = new Set<string>();

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, currentUrl).toString();
        const normalizedUrl = this.normalizeUrl(absoluteUrl);

        // Skip if already seen
        if (seenUrls.has(normalizedUrl)) return;
        seenUrls.add(normalizedUrl);

        // Skip non-HTTP(S) URLs
        if (!normalizedUrl.startsWith('http')) return;

        const urlObj = new URL(normalizedUrl);
        const isInternal = urlObj.hostname === baseDomain || 
                          urlObj.hostname.endsWith(`.${baseDomain}`);

        if (isInternal) {
          internal.push(normalizedUrl);
        } else {
          external.push(normalizedUrl);
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return { internal, external };
  }

  /**
   * Extract images from the page
   */
  private extractImages($: cheerio.CheerioAPI, currentUrl: string) {
    const images: ExtractedContent['images'] = [];
    const seenUrls = new Set<string>();

    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (!src) return;

      try {
        const absoluteUrl = new URL(src, currentUrl).toString();
        
        // Skip if already seen
        if (seenUrls.has(absoluteUrl)) return;
        seenUrls.add(absoluteUrl);

        // Skip data URLs and very small images (likely icons/tracking pixels)
        if (src.startsWith('data:') || src.includes('1x1') || src.includes('pixel')) return;

        const alt = $(element).attr('alt') || '';
        const title = $(element).attr('title') || '';
        const width = parseInt($(element).attr('width') || '0', 10) || undefined;
        const height = parseInt($(element).attr('height') || '0', 10) || undefined;

        // Classify image type based on context and attributes
        const type = this.classifyImageType($, element, alt, src);

        images.push({
          src: absoluteUrl,
          alt,
          title,
          width,
          height,
          type
        });
      } catch (error) {
        // Invalid URL, skip
      }
    });

    return images;
  }

  /**
   * Classify image type based on context
   */
  private classifyImageType($: cheerio.CheerioAPI, element: any, alt: string, src: string): ExtractedContent['images'][0]['type'] {
    const $img = $(element);
    const classes = $img.attr('class') || '';
    const id = $img.attr('id') || '';
    const parentClasses = $img.parent().attr('class') || '';
    
    // Check for logo indicators
    if (classes.includes('logo') || id.includes('logo') || alt.toLowerCase().includes('logo') || 
        src.toLowerCase().includes('logo') || parentClasses.includes('logo')) {
      return 'logo';
    }

    // Check for product images
    if (classes.includes('product') || parentClasses.includes('product') || 
        alt.toLowerCase().includes('product') || src.toLowerCase().includes('product')) {
      return 'product';
    }

    // Check for avatars/profile images
    if (classes.includes('avatar') || classes.includes('profile') || 
        alt.toLowerCase().includes('avatar') || alt.toLowerCase().includes('profile')) {
      return 'avatar';
    }

    // Check for icons (small images)
    if (classes.includes('icon') || src.toLowerCase().includes('icon') || 
        $img.attr('width') === '16' || $img.attr('width') === '32' || $img.attr('height') === '16' || $img.attr('height') === '32') {
      return 'icon';
    }

    // Check if it's in main content area
    const $contentArea = $img.closest('article, .content, .main, main, #content, #main');
    if ($contentArea.length > 0) {
      return 'content';
    }

    return 'unknown';
  }

  /**
   * Extract content chunks with basic classification
   */
  private extractContentChunks($: cheerio.CheerioAPI) {
    const chunks: ExtractedContent['contentChunks'] = [];

    // Define content patterns with selectors and types
    const patterns = [
      // Articles
      {
        selectors: ['article', '.article', '.post', '.blog-post', '.news-item'],
        type: 'article' as const,
        confidence: 0.9
      },
      // Products
      {
        selectors: ['.product', '.product-item', '.product-card', '.item', '[data-product]'],
        type: 'product' as const,
        confidence: 0.8
      },
      // Listings
      {
        selectors: ['.listing', '.list-item', '.search-result', '.result-item', 'ul > li', 'ol > li'],
        type: 'listing' as const,
        confidence: 0.7
      },
      // Tables
      {
        selectors: ['table', '.table', '.data-table'],
        type: 'table' as const,
        confidence: 0.9
      },
      // Navigation
      {
        selectors: ['nav', '.navigation', '.menu', '.nav', 'header nav'],
        type: 'navigation' as const,
        confidence: 0.9
      },
      // Footer
      {
        selectors: ['footer', '.footer', '.page-footer'],
        type: 'footer' as const,
        confidence: 0.9
      },
      // Sidebar
      {
        selectors: ['aside', '.sidebar', '.side-panel', '.widget'],
        type: 'sidebar' as const,
        confidence: 0.8
      }
    ];

    patterns.forEach(pattern => {
      pattern.selectors.forEach(selector => {
        $(selector).each((_, element) => {
          const $element = $(element);
          const content = $element.text().trim();
          
          if (content.length > 20) { // Only include substantial content
            chunks.push({
              type: pattern.type,
              selector,
              content,
              confidence: pattern.confidence
            });
          }
        });
      });
    });

    // If no specific patterns found, extract main content areas
    if (chunks.length === 0) {
      const mainSelectors = ['main', '[role="main"]', '.main-content', '.content'];
      
      mainSelectors.forEach(selector => {
        $(selector).each((_, element) => {
          const content = $(element).text().trim();
          if (content.length > 50) {
            chunks.push({
              type: 'unknown',
              selector,
              content,
              confidence: 0.5
            });
          }
        });
      });
    }

    return chunks;
  }

  /**
   * Generate content hash for deduplication
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Normalize URL for consistent comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove fragment
      urlObj.hash = '';
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      // Sort remaining parameters
      urlObj.searchParams.sort();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Convert HTML to Markdown
   */
  convertToMarkdown(html: string): string {
    return this.turndownService.turndown(html);
  }

  /**
   * Extract structured data (JSON-LD, microdata)
   */
  extractStructuredData($: cheerio.CheerioAPI): any[] {
    const structuredData: any[] = [];

    // Extract JSON-LD
    $('script[type="application/ld+json"]').each((_, element) => {
      try {
        const jsonData = JSON.parse($(element).html() || '');
        structuredData.push(jsonData);
      } catch (error) {
        // Invalid JSON, skip
      }
    });

    return structuredData;
  }

  /**
   * Check if content is substantial (not just navigation/ads)
   */
  isSubstantialContent(content: string): boolean {
    const minLength = 100;
    const maxRepeatedChars = 0.3; // 30% repeated characters threshold
    
    if (content.length < minLength) {
      return false;
    }

    // Check for too many repeated characters (spam detection)
    const charFreq: { [key: string]: number } = {};
    for (const char of content.toLowerCase()) {
      charFreq[char] = (charFreq[char] || 0) + 1;
    }

    const maxFreq = Math.max(...Object.values(charFreq));
    if (maxFreq / content.length > maxRepeatedChars) {
      return false;
    }

    return true;
  }
} 