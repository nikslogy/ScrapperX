/**
 * Shared types used across multiple modules
 */

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

export interface RobotsInfo {
  url: string;
  robotsUrl: string;
  isAllowed: boolean;
  userAgent: string;
  crawlDelay?: number;
  sitemaps: string[];
  rules: Array<{
    userAgent: string;
    allow: string[];
    disallow: string[];
  }>;
  rawContent?: string;
  error?: string;
}

export interface ExtractedContent {
  title?: string;
  description?: string;
  keywords?: string[];
  contentType: string;
  charset: string;
  language?: string;
  textContent: string;
  htmlContent: string;
  markdownContent?: string;
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

export interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  respectRobots: boolean;
  delay: number;
  concurrent: number;
  includePatterns: string[];
  excludePatterns: string[];
  userAgent?: string;
  timeout?: number;
  authentication?: AuthConfig;
  extraction?: {
    enableStructuredData: boolean;
    customSelectors?: { [key: string]: string };
    dataTypes?: string[];
    qualityThreshold?: number;
  };
  forceMethod?: 'static' | 'dynamic' | 'stealth' | 'adaptive' | 'api';
  enableApiScraping?: boolean;
  enableDynamicScraping?: boolean;
  enableStealthScraping?: boolean;
  enableAdaptiveScraping?: boolean;
  captchaSolver?: 'manual' | '2captcha' | 'anticaptcha' | 'skip';
  captchaApiKey?: string;
  stealthLevel?: 'basic' | 'advanced' | 'maximum';
  learningMode?: boolean;
}

export interface CrawlProgress {
  sessionId: string;
  status: string;
  totalUrls: number;
  processedUrls: number;
  failedUrls: number;
  extractedItems: number;
  currentUrl?: string;
  estimatedCompletion?: Date;
  errors: string[];
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'form' | 'bearer' | 'cookie';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    cookies?: { [key: string]: string };
    loginUrl?: string;
    usernameField?: string;
    passwordField?: string;
    submitSelector?: string;
    successIndicator?: string;
  };
}
