export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  content: string;
  markdownContent?: string; // Clean Firecrawl-style markdown
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

export interface ScrapingStrategy {
  method: 'static' | 'dynamic' | 'stealth' | 'adaptive' | 'api' | 'hybrid';
  confidence: number;
  reasons: string[];
  estimatedTime: number;
}

export interface PerformanceMetrics {
  totalTime: number;
  staticTime?: number;
  dynamicTime?: number;
  apiTime?: number;
  methodsAttempted: string[];
}

export interface ApiDataSummary {
  endpointsFound: number;
  dataPointsExtracted: number;
  structuredContent: {
    articles?: unknown[];
    products?: unknown[];
    listings?: unknown[];
    comments?: unknown[];
    metadata?: unknown;
  };
}

export interface AdditionalContent {
  dynamicContent?: string;
  apiContent?: unknown[];
  structuredData?: unknown;
}

export interface ScrapedData extends ScrapedContent {
  robotsCompliance: RobotsCompliance & {
    policy?: string;
    enforced?: boolean;
  };
  summary?: string;
  strategy?: ScrapingStrategy;
  qualityScore?: number;
  completenessScore?: number;
  performanceMetrics?: PerformanceMetrics;
  apiData?: ApiDataSummary;
  additionalContent?: AdditionalContent;
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
  maxRetries?: number;
  forceMethod?: 'static' | 'dynamic' | 'stealth' | 'adaptive' | 'api';
  enableApiScraping?: boolean;
  enableDynamicScraping?: boolean;
  enableStealthScraping?: boolean;
  enableAdaptiveScraping?: boolean;
  respectRobots?: boolean;
  qualityThreshold?: number;
  captchaSolver?: 'manual' | '2captcha' | 'anticaptcha' | 'skip';
  captchaApiKey?: string;
  stealthLevel?: 'basic' | 'advanced' | 'maximum';
  learningMode?: boolean;
}

export interface WebsiteProfile {
  domain: string;
  characteristics: {
    hasAntiBot: boolean;
    requiresJS: boolean;
    hasRateLimit: boolean;
    hasCaptcha: boolean;
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  };
  successRates: {
    static: number;
    dynamic: number;
    stealth: number;
  };
  optimalStrategy: {
    type: string;
    confidence: number;
    options: Record<string, unknown>;
  };
  lastUpdated: string;
  totalAttempts: number;
  recentFailures: string[];
}

export interface SuccessRateData {
  domain: string;
  rates: {
    static: number;
    dynamic: number;
    stealth: number;
  };
  difficulty: string;
}

export interface SuccessRatesSummary {
  totalDomains: number;
  successRates: SuccessRateData[];
  summary: {
    averageStaticSuccess: number;
    averageDynamicSuccess: number;
    averageStealthSuccess: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
      extreme: number;
    };
  };
} 