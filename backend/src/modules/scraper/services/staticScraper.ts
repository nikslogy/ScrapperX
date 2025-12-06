import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string;
  links: Array<{
    text: string;
    href: string;
    internal: boolean;
  }>;
  images: Array<{
    src: string;
    alt: string;
    title?: string;
  }>;
  headings: Array<{
    level: number;
    text: string;
  }>;
  metadata: {
    metaDescription?: string;
    metaKeywords?: string;
    author?: string;
    publishedDate?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  wordCount: number;
  scrapedAt: Date;
  method: 'static' | 'dynamic' | 'stealth' | 'adaptive';
}

export interface ScrapeOptions {
  userAgent?: string;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
}

export class StaticScraper {
  private defaultOptions: ScrapeOptions = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 15000,
    followRedirects: true,
    maxRedirects: 5
  };

  async scrape(url: string, options?: ScrapeOptions): Promise<ScrapedContent> {
    const config = { ...this.defaultOptions, ...options };
    
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
      }

      // Make HTTP request
      const response = await axios.get(url, {
        headers: {
          'User-Agent': config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: config.timeout,
        maxRedirects: config.maxRedirects,
        validateStatus: (status) => status < 400, // Accept only 2xx and 3xx status codes
      });

      // Parse HTML with Cheerio
      const $ = cheerio.load(response.data);

      // Extract title
      const title = $('title').first().text().trim() || 
                   $('h1').first().text().trim() || 
                   'No title found';

      // Extract meta description
      const metaDescription = $('meta[name="description"]').attr('content') || 
                             $('meta[property="og:description"]').attr('content') || '';

      // Comprehensive content extraction with maximum depth
      const contentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '[data-testid*="content"]',
        '[class*="content"]',
        '[class*="post"]',
        '[class*="article"]',
        '[class*="story"]',
        '[class*="text"]',
        '[class*="body"]',
        '[class*="description"]',
        '[class*="details"]',
        '[class*="info"]',
        '[class*="summary"]',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content-body',
        '.main-content',
        '#content',
        '#main',
        '#article',
        '[id*="content"]',
        '[id*="article"]',
        '[id*="post"]',
        'section',
        '.section',
        'div[class*="container"]',
        'div[class*="wrapper"]',
        'body'
      ];

      let content = '';
      let bestContent = '';
      let maxLength = 0;

      // Try all selectors and pick the one with most content
      for (const selector of contentSelectors) {
        const elements = $(selector);
        elements.each((_, element) => {
          const $element = $(element);
          
          // Remove unwanted elements but preserve structure
          const clonedElement = $element.clone();
          clonedElement.find(`
            script, style, nav, footer, aside, header,
            .nav, .navigation, .sidebar, .ad, .advertisement,
            [class*="ad-"], [id*="ad-"], [class*="banner"],
            [class*="popup"], [class*="modal"], [class*="overlay"],
            [class*="cookie"], [class*="gdpr"], [class*="consent"],
            [class*="share"], [class*="social"], [class*="comment"],
            [class*="related"], [class*="recommend"]
          `).remove();
          
          const text = clonedElement.text().replace(/\s+/g, ' ').trim();
          if (text.length > maxLength && text.length > 50) {
            maxLength = text.length;
            bestContent = text;
          }
        });
      }

      content = bestContent;

      // Enhanced fallback content extraction - get everything
      if (!content || content.length < 200) {
        const bodyClone = $('body').clone();
        bodyClone.find(`
          script, style, nav, footer, aside, header,
          .nav, .navigation, .sidebar, .ad, .advertisement,
          [class*="ad-"], [id*="ad-"], [class*="banner"],
          [class*="popup"], [class*="modal"], [class*="overlay"],
          [class*="cookie"], [class*="gdpr"], [class*="consent"]
        `).remove();
        
        content = bodyClone.text().replace(/\s+/g, ' ').trim();
      }

      // Extract all links comprehensively
      const links = $('a[href]').map((_, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        if (!href) return null;

        try {
          const linkUrl = new URL(href, url);
          return {
            text: text || href,
            href: linkUrl.href,
            internal: linkUrl.hostname === parsedUrl.hostname
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);

      // Extract all images and media comprehensively
      const images = $('img[src], img[data-src], img[data-lazy-src], picture source[srcset], video[poster]').map((_, el) => {
        const $img = $(el);
        const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('srcset') || $img.attr('poster');
        if (!src) return null;

        try {
          const imgUrl = new URL(src.split(' ')[0], url); // Handle srcset
          return {
            src: imgUrl.href,
            alt: $img.attr('alt') || '',
            title: $img.attr('title')
          };
        } catch {
          return null;
        }
      }).get().filter(Boolean);

      // Extract headings
      const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => {
        const $heading = $(el);
        return {
          level: parseInt(el.tagName.charAt(1)),
          text: $heading.text().trim()
        };
      }).get().filter(h => h.text);

      // Extract metadata
      const metadata = {
        metaDescription: metaDescription || undefined,
        metaKeywords: $('meta[name="keywords"]').attr('content') || undefined,
        author: $('meta[name="author"]').attr('content') || undefined,
        publishedDate: $('meta[property="article:published_time"]').attr('content') ||
                      $('meta[name="date"]').attr('content') || undefined,
        ogTitle: $('meta[property="og:title"]').attr('content') || undefined,
        ogDescription: $('meta[property="og:description"]').attr('content') || undefined,
        ogImage: $('meta[property="og:image"]').attr('content') || undefined
      };

      // Calculate word count
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      return {
        url: response.request.res.responseUrl || url, // Handle redirects
        title,
        description: metaDescription,
        content,
        links: links, // No artificial limits - get everything
        images: images, // No artificial limits - get everything
        headings,
        metadata,
        wordCount,
        scrapedAt: new Date(),
        method: 'static'
      };

    } catch (error: any) {
      if (error.code === 'ENOTFOUND') {
        throw new Error('Website not found. Please check the URL and try again.');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('Connection refused. The website may be down.');
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error('Request timed out. The website is taking too long to respond.');
      } else if (error.response?.status === 403) {
        throw new Error('Access forbidden. The website has blocked scraping.');
      } else if (error.response?.status === 404) {
        throw new Error('Page not found (404).');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. The website is experiencing issues.');
      } else {
        throw new Error(`Failed to scrape website: ${error.message}`);
      }
    }
  }
} 