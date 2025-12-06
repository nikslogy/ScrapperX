import { chromium, Browser, Page } from 'playwright';
import * as cheerio from 'cheerio';
import { ScrapedContent } from './staticScraper';

export interface DynamicScrapeOptions {
  userAgent?: string;
  timeout?: number;
  waitForSelector?: string;
  waitForNetworkIdle?: boolean;
  blockImages?: boolean;
  blockCSS?: boolean;
  viewport?: { width: number; height: number };
  javascript?: boolean;
}

export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  response?: {
    status: number;
    contentType: string;
    size: number;
  };
}

export class DynamicScraper {
  private browser: Browser | null = null;
  private defaultOptions: DynamicScrapeOptions = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 15000, // Reduced from 30000 to prevent hangs
    waitForNetworkIdle: false, // Disabled to prevent infinite waiting
    blockImages: true,
    blockCSS: false,
    viewport: { width: 1920, height: 1080 },
    javascript: true
  };

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  async scrape(url: string, options?: DynamicScrapeOptions): Promise<{
    content: ScrapedContent;
    networkRequests: NetworkRequest[];
    performanceMetrics: any;
    screenshots?: Buffer[];
  }> {
    const config = { ...this.defaultOptions, ...options };
    await this.initialize();

    if (!this.browser) {
      throw new Error('Failed to initialize browser');
    }

    const context = await this.browser.newContext({
      userAgent: config.userAgent,
      viewport: config.viewport,
      ignoreHTTPSErrors: true,
    });

    // Block unnecessary resources for faster loading
    await context.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      
      if (config.blockImages && resourceType === 'image') {
        route.abort();
      } else if (config.blockCSS && resourceType === 'stylesheet') {
        route.abort();
      } else if (resourceType === 'font' || resourceType === 'media') {
        route.abort();
      } else {
        route.continue();
      }
    });

    const page = await context.newPage();
    const networkRequests: NetworkRequest[] = [];

    // Monitor network requests
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    page.on('response', (response) => {
      const request = networkRequests.find(req => req.url === response.url());
      if (request) {
        request.response = {
          status: response.status(),
          contentType: response.headers()['content-type'] || '',
          size: parseInt(response.headers()['content-length'] || '0')
        };
      }
    });

    try {
      // Navigate to the page with safer settings
      const response = await page.goto(url, {
        waitUntil: 'domcontentloaded', // Always use domcontentloaded, never networkidle
        timeout: config.timeout
      });

      if (!response || response.status() >= 400) {
        throw new Error(`HTTP ${response?.status()}: Failed to load page`);
      }

      // Wait for specific selector if provided (reduced timeout)
      if (config.waitForSelector) {
        await page.waitForSelector(config.waitForSelector, { timeout: 5000 });
      }

      // Brief wait for dynamic content (reduced from 2000ms to 500ms)
      await page.waitForTimeout(500);

      // Execute JavaScript to enhance content extraction
      await page.evaluate(() => {
        // Remove hidden elements that might interfere
        const hiddenElements = document.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]');
        hiddenElements.forEach((el: any) => el.remove());

        // Trigger any lazy loading
        window.scrollTo(0, document.body.scrollHeight);
        window.scrollTo(0, 0);
      });

      // Get the final HTML content
      const html = await page.content();
      const finalUrl = page.url();

      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        return {
          loadTime: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        };
      });

      // Take screenshot for debugging (optional)
      const screenshot = await page.screenshot({ fullPage: false });

      // Parse the HTML with Cheerio for content extraction
      const $ = cheerio.load(html);

      // Enhanced content extraction for dynamic sites
      const content = this.extractDynamicContent($, finalUrl);

      await context.close();

      return {
        content: {
          ...content,
          method: 'dynamic' as const,
          scrapedAt: new Date(),
        },
        networkRequests,
        performanceMetrics,
        screenshots: [screenshot]
      };

    } catch (error: any) {
      await context.close();
      throw new Error(`Dynamic scraping failed: ${error.message}`);
    }
  }

  private extractDynamicContent($: cheerio.CheerioAPI, url: string): Omit<ScrapedContent, 'method' | 'scrapedAt'> {
    // Enhanced content extraction for dynamic sites
    const title = $('title').first().text().trim() || 
                 $('h1').first().text().trim() || 
                 $('[data-testid*="title"], [class*="title"], [id*="title"]').first().text().trim() ||
                 'No title found';

    const metaDescription = $('meta[name="description"]').attr('content') || 
                           $('meta[property="og:description"]').attr('content') || '';

    // Enhanced content selectors for modern web apps
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '[data-testid*="content"]',
      '[class*="content"]',
      '[class*="post"]',
      '[class*="article"]',
      '.entry-content',
      '#content',
      '[id*="content"]',
      'body'
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        // Remove unwanted elements
        element.find('script, style, nav, footer, aside, .nav, .navigation, .sidebar, .ad, .advertisement, [class*="ad-"], [id*="ad-"]').remove();
        const text = element.text().replace(/\s+/g, ' ').trim();
        if (text.length > 100) {
          content = text;
          break;
        }
      }
    }

    // Fallback content extraction
    if (!content) {
      $('script, style, nav, footer, aside, .ad, .advertisement').remove();
      content = $('body').text().replace(/\s+/g, ' ').trim();
    }

    // Enhanced link extraction
    const links = $('a[href]').map((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (!href || !text || text.length > 200) return null;

      try {
        const linkUrl = new URL(href, url);
        const parsedUrl = new URL(url);
        return {
          text,
          href: linkUrl.href,
          internal: linkUrl.hostname === parsedUrl.hostname
        };
      } catch {
        return null;
      }
    }).get().filter(Boolean);

    // Enhanced image extraction
    const images = $('img[src], img[data-src], img[data-lazy-src]').map((_, el) => {
      const $img = $(el);
      const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
      if (!src) return null;

      try {
        const imgUrl = new URL(src, url);
        return {
          src: imgUrl.href,
          alt: $img.attr('alt') || '',
          title: $img.attr('title')
        };
      } catch {
        return null;
      }
    }).get().filter(Boolean);

    // Enhanced heading extraction
    const headings = $('h1, h2, h3, h4, h5, h6, [class*="heading"], [class*="title"]').map((_, el) => {
      const $heading = $(el);
      const tagName = el.tagName.toLowerCase();
      let level = 1;
      
      if (tagName.match(/^h[1-6]$/)) {
        level = parseInt(tagName.charAt(1));
      } else {
        // Estimate level based on font size or class names
        const className = $heading.attr('class') || '';
        if (className.includes('h1') || className.includes('title-1')) level = 1;
        else if (className.includes('h2') || className.includes('title-2')) level = 2;
        else if (className.includes('h3') || className.includes('title-3')) level = 3;
        else level = 2; // default
      }

      return {
        level,
        text: $heading.text().trim()
      };
    }).get().filter(h => h.text && h.text.length > 0);

    // Enhanced metadata extraction
    const metadata = {
      metaDescription: metaDescription || undefined,
      metaKeywords: $('meta[name="keywords"]').attr('content') || undefined,
      author: $('meta[name="author"]').attr('content') || 
              $('meta[property="article:author"]').attr('content') || undefined,
      publishedDate: $('meta[property="article:published_time"]').attr('content') ||
                    $('meta[name="date"]').attr('content') ||
                    $('time[datetime]').attr('datetime') || undefined,
      ogTitle: $('meta[property="og:title"]').attr('content') || undefined,
      ogDescription: $('meta[property="og:description"]').attr('content') || undefined,
      ogImage: $('meta[property="og:image"]').attr('content') || undefined,
      twitterCard: $('meta[name="twitter:card"]').attr('content') || undefined,
      canonical: $('link[rel="canonical"]').attr('href') || undefined,
    };

    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    return {
      url,
      title,
      description: metaDescription,
      content,
      links: links.slice(0, 100),
      images: images.slice(0, 50),
      headings,
      metadata,
      wordCount
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Force cleanup method for emergency situations
  async forceCleanup(): Promise<void> {
    try {
      if (this.browser) {
        const contexts = this.browser.contexts();
        for (const context of contexts) {
          const pages = context.pages();
          await Promise.all(pages.map(page => page.close().catch(() => {})));
          await context.close().catch(() => {});
        }
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    } catch (error) {
      console.error('Force cleanup failed:', error);
      this.browser = null; // Force null even if cleanup fails
    }
  }

  // Analyze if a page needs dynamic scraping
  static async needsDynamicScraping(url: string, staticContent: string): Promise<{
    needsDynamic: boolean;
    reasons: string[];
    confidence: number;
  }> {
    const reasons: string[] = [];
    let score = 0;

    // Check for SPA indicators
    if (staticContent.includes('ng-app') || staticContent.includes('data-reactroot') || 
        staticContent.includes('__NEXT_DATA__') || staticContent.includes('nuxt')) {
      reasons.push('Single Page Application detected');
      score += 30;
    }

    // Check for minimal content
    const textContent = staticContent.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 500) {
      reasons.push('Minimal static content detected');
      score += 25;
    }

    // Check for loading indicators
    if (staticContent.includes('loading') || staticContent.includes('spinner') || 
        staticContent.includes('skeleton')) {
      reasons.push('Loading indicators found');
      score += 20;
    }

    // Check for AJAX/fetch patterns
    if (staticContent.includes('fetch(') || staticContent.includes('XMLHttpRequest') || 
        staticContent.includes('axios') || staticContent.includes('$.ajax')) {
      reasons.push('AJAX/fetch patterns detected');
      score += 25;
    }

    // Check for lazy loading
    if (staticContent.includes('data-src') || staticContent.includes('lazy') || 
        staticContent.includes('intersection-observer')) {
      reasons.push('Lazy loading detected');
      score += 15;
    }

    const confidence = Math.min(score, 100);
    const needsDynamic = confidence > 40;

    return { needsDynamic, reasons, confidence };
  }
}

export default DynamicScraper; 