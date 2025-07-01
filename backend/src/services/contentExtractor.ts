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
  contentHash: string;
  extractedLinks: {
    internal: string[];
    external: string[];
  };
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
      codeBlockStyle: 'fenced'
    });
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
    
    // Extract content chunks
    const contentChunks = this.extractContentChunks($);
    
    return {
      title,
      description,
      keywords,
      contentType: 'text/html',
      charset: 'utf-8',
      language,
      textContent,
      htmlContent,
      contentHash,
      extractedLinks,
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
    return $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content');
  }

  /**
   * Extract clean text content
   */
  private extractTextContent($: cheerio.CheerioAPI): string {
    // Remove unwanted elements
    $('nav, header, footer, aside, .sidebar, .navigation, .menu, .ads, .advertisement').remove();
    
    // Get main content areas
    const mainSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      'article',
      '.article'
    ];

    let mainContent = '';
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length) {
        mainContent = element.text().trim();
        break;
      }
    }

    // Fallback to body if no main content found
    if (!mainContent) {
      mainContent = $('body').text().trim();
    }

    // Clean up whitespace
    return mainContent.replace(/\s+/g, ' ').trim();
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