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
  scrapedAt: string;
  method: 'static' | 'dynamic';
}

export interface RobotsCompliance {
  isAllowed: boolean;
  crawlDelay?: number;
  robotsUrl: string;
}

export interface ScrapedData extends ScrapedContent {
  robotsCompliance: RobotsCompliance;
  summary?: string;
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

export interface ComplianceReport {
  canScrape: boolean;
  recommendations: string[];
  warnings: string[];
}

export interface RobotsCheckData {
  robotsInfo: RobotsInfo;
  complianceReport: ComplianceReport;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  error?: string;
  message?: string;
}

export type ScrapingState = 
  | 'idle' 
  | 'checking-robots' 
  | 'robots-checked' 
  | 'scraping' 
  | 'completed' 
  | 'error';

export interface ScrapeOptions {
  userAgent?: string;
  timeout?: number;
  followRedirects?: boolean;
  maxRedirects?: number;
} 