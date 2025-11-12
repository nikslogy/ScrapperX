import mongoose, { Document, Schema } from 'mongoose';

// Crawl Session Model
export interface ICrawlSession extends Document {
  sessionId: string;
  domain: string;
  startUrl: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  config: {
    maxPages: number;
    maxDepth: number;
    respectRobots: boolean;
    delay: number;
    concurrent: number;
    includePatterns: string[];
    excludePatterns: string[];
    authentication?: {
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
    };
    extraction?: {
      enableStructuredData: boolean;
      customSelectors?: { [key: string]: string };
      dataTypes?: string[];
      qualityThreshold?: number;
    };
    // Scraping mode options (same as quick scraper)
    forceMethod?: 'static' | 'dynamic' | 'stealth' | 'adaptive' | 'api';
    enableApiScraping?: boolean;
    enableDynamicScraping?: boolean;
    enableStealthScraping?: boolean;
    enableAdaptiveScraping?: boolean;
    captchaSolver?: 'manual' | '2captcha' | 'anticaptcha' | 'skip';
    captchaApiKey?: string;
    stealthLevel?: 'basic' | 'advanced' | 'maximum';
    learningMode?: boolean;
  };
  stats: {
    totalUrls: number;
    processedUrls: number;
    failedUrls: number;
    extractedItems: number;
    startTime: Date;
    endTime?: Date;
    estimatedCompletion?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const crawlSessionSchema = new Schema<ICrawlSession>({
  sessionId: { type: String, required: true, unique: true, index: true },
  domain: { type: String, required: true, index: true },
  startUrl: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'paused', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  config: {
    maxPages: { type: Number, default: 100 },
    maxDepth: { type: Number, default: 5 },
    respectRobots: { type: Boolean, default: true },
    delay: { type: Number, default: 1000 },
    concurrent: { type: Number, default: 3 },
    includePatterns: [{ type: String }],
    excludePatterns: [{ type: String }],
    authentication: {
      type: { 
        type: String, 
        enum: ['none', 'basic', 'form', 'bearer', 'cookie'],
        default: 'none'
      },
      credentials: {
        username: { type: String },
        password: { type: String },
        token: { type: String },
        cookies: { type: Schema.Types.Mixed },
        loginUrl: { type: String },
        usernameField: { type: String, default: 'username' },
        passwordField: { type: String, default: 'password' },
        submitSelector: { type: String, default: 'input[type="submit"], button[type="submit"]' },
        successIndicator: { type: String }
      }
    },
    extraction: {
      enableStructuredData: { type: Boolean, default: true },
      customSelectors: { type: Schema.Types.Mixed },
      dataTypes: [{ type: String }],
      qualityThreshold: { type: Number, default: 0.7 }
    },
    // Scraping mode options (same as quick scraper)
    forceMethod: { 
      type: String, 
      enum: ['static', 'dynamic', 'stealth', 'adaptive', 'api']
    },
    enableApiScraping: { type: Boolean, default: true },
    enableDynamicScraping: { type: Boolean, default: true },
    enableStealthScraping: { type: Boolean, default: true },
    enableAdaptiveScraping: { type: Boolean, default: true },
    captchaSolver: { 
      type: String, 
      enum: ['manual', '2captcha', 'anticaptcha', 'skip'],
      default: 'skip'
    },
    captchaApiKey: { type: String },
    stealthLevel: { 
      type: String, 
      enum: ['basic', 'advanced', 'maximum'],
      default: 'advanced'
    },
    learningMode: { type: Boolean, default: true }
  },
  stats: {
    totalUrls: { type: Number, default: 0 },
    processedUrls: { type: Number, default: 0 },
    failedUrls: { type: Number, default: 0 },
    extractedItems: { type: Number, default: 0 },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    estimatedCompletion: { type: Date },
  }
}, {
  timestamps: true,
  collection: 'crawlsessions'
});

// Performance indexes for sessions
crawlSessionSchema.index({ status: 1, createdAt: -1 }); // For listing active/completed sessions
crawlSessionSchema.index({ domain: 1, createdAt: -1 }); // For domain-based queries
crawlSessionSchema.index({ 'stats.startTime': -1 }); // For time-based queries
crawlSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// URL Queue Model
export interface IUrlQueue extends Document {
  sessionId: string;
  url: string;
  priority: number;
  depth: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  parentUrl?: string;
  attempts: number;
  lastError?: string;
  discoveredAt: Date;
  processedAt?: Date;
}

const urlQueueSchema = new Schema<IUrlQueue>({
  sessionId: { type: String, required: true, index: true },
  url: { type: String, required: true },
  priority: { type: Number, default: 0 },
  depth: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  parentUrl: { type: String },
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
  discoveredAt: { type: Date, default: Date.now },
  processedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'urlqueue'
});

// Performance indexes for URL queue
urlQueueSchema.index({ sessionId: 1, status: 1, priority: -1 }); // Main query index
urlQueueSchema.index({ url: 1 }); // For duplicate detection
urlQueueSchema.index({ status: 1, discoveredAt: 1 }); // For cleanup queries
urlQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // Auto-delete after 7 days

// Raw Content Model
export interface IRawContent extends Document {
  sessionId: string;
  url: string;
  contentHash: string;
  htmlContent: string;
  textContent: string;
  markdownContent?: string; // Clean markdown content (Firecrawl-style)
  metadata: {
    title?: string;
    description?: string;
    keywords?: string[];
    contentType: string;
    charset: string;
    language?: string;
    lastModified?: Date;
    structuredData?: any;
    // Phase 3: Structured extraction fields
    extractedData?: {
      schema: string;
      version: string;
      fields: { [key: string]: any };
      nestedStructures: any[];
      qualityScore: number;
      extractionMethod: 'pattern' | 'selector' | 'heuristic';
      extractedAt: Date;
    };
  };
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
  processingStatus: 'raw' | 'analyzed' | 'extracted' | 'exported';
  createdAt: Date;
}

const rawContentSchema = new Schema<IRawContent>({
  sessionId: { type: String, required: true, index: true },
  url: { type: String, required: true, index: true },
  contentHash: { type: String, required: true, index: true },
  htmlContent: { type: String, required: true },
  textContent: { type: String, required: true },
  markdownContent: { type: String }, // Clean markdown content (Firecrawl-style)
  metadata: {
    title: { type: String },
    description: { type: String },
    keywords: [{ type: String }],
    contentType: { type: String, required: true },
    charset: { type: String, required: true },
    language: { type: String },
    lastModified: { type: Date },
    // Phase 3: Structured extraction fields
    extractedData: {
      schema: { type: String },
      version: { type: String },
      fields: { type: Schema.Types.Mixed },
      nestedStructures: [{ type: Schema.Types.Mixed }],
      qualityScore: { type: Number, min: 0, max: 1 },
      extractionMethod: {
        type: String,
        enum: ['pattern', 'selector', 'heuristic']
      },
      extractedAt: { type: Date }
    }
  },
  extractedLinks: {
    internal: [{ type: String }],
    external: [{ type: String }]
  },
  images: [{
    src: { type: String, required: true },
    alt: { type: String },
    title: { type: String },
    width: { type: Number },
    height: { type: Number },
    type: { 
      type: String, 
      enum: ['logo', 'product', 'content', 'avatar', 'icon', 'unknown'],
      default: 'unknown'
    }
  }],
  contentChunks: [{
    type: { 
      type: String, 
      enum: ['article', 'product', 'listing', 'table', 'navigation', 'footer', 'sidebar', 'unknown'],
      required: true 
    },
    selector: { type: String, required: true },
    content: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 1 }
  }],
  processingStatus: { 
    type: String, 
    enum: ['raw', 'analyzed', 'extracted', 'exported'],
    default: 'raw',
    index: true
  }
}, {
  timestamps: true,
  collection: 'rawcontent'
});

// Performance indexes for raw content
rawContentSchema.index({ sessionId: 1, createdAt: 1 }); // For session-based queries
rawContentSchema.index({ url: 1, contentHash: 1 }); // For duplicate detection
rawContentSchema.index({ 'metadata.title': 'text', 'metadata.description': 'text', textContent: 'text' }, { name: 'content_text_search' }); // Text search
rawContentSchema.index({ processingStatus: 1, createdAt: 1 }); // For processing queries
rawContentSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Crawl Patterns Model (for AI learning)
export interface ICrawlPattern extends Document {
  domain: string;
  patternType: 'layout' | 'content' | 'navigation' | 'pagination';
  selector: string;
  description: string;
  confidence: number;
  usageCount: number;
  successRate: number;
  lastUsed: Date;
  examples: {
    url: string;
    extractedData: any;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const crawlPatternSchema = new Schema<ICrawlPattern>({
  domain: { type: String, required: true, index: true },
  patternType: { 
    type: String, 
    enum: ['layout', 'content', 'navigation', 'pagination'],
    required: true 
  },
  selector: { type: String, required: true },
  description: { type: String, required: true },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  usageCount: { type: Number, default: 0 },
  successRate: { type: Number, default: 0, min: 0, max: 1 },
  lastUsed: { type: Date, default: Date.now },
  examples: [{
    url: { type: String, required: true },
    extractedData: { type: Schema.Types.Mixed }
  }]
}, {
  timestamps: true,
  collection: 'crawlpatterns'
});

// Performance indexes for patterns
crawlPatternSchema.index({ domain: 1, patternType: 1, confidence: -1 }); // Main query index
crawlPatternSchema.index({ lastUsed: -1 }); // For cleanup of unused patterns
crawlPatternSchema.index({ successRate: -1, usageCount: -1 }); // For pattern quality queries

// Export models
export const CrawlSession = mongoose.model<ICrawlSession>('CrawlSession', crawlSessionSchema);
export const UrlQueue = mongoose.model<IUrlQueue>('UrlQueue', urlQueueSchema);
export const RawContent = mongoose.model<IRawContent>('RawContent', rawContentSchema);
export const CrawlPattern = mongoose.model<ICrawlPattern>('CrawlPattern', crawlPatternSchema); 