import { Browser, Page } from 'playwright';
import { chromium } from 'playwright';
import { URL } from 'url';
import { v4 as uuidv4 } from 'uuid';
import robotsParser from 'robots-parser';

import { CrawlSession, ICrawlSession, RawContent } from '../../../models/crawlerModels';
import { URLQueueService } from './urlQueue';
import { ContentExtractorService } from './contentExtractor';
import { AuthenticationHandler, AuthConfig } from './authenticationHandler';
import { StructuredExtractor } from './structuredExtractor';

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

export class DomainCrawlerService {
  private urlQueue: URLQueueService;
  private contentExtractor: ContentExtractorService;
  private authHandler: AuthenticationHandler;
  private structuredExtractor: StructuredExtractor;
  private activeCrawlers: Map<string, { browser: Browser; pages: Page[] }> = new Map();
  private crawlProgress: Map<string, CrawlProgress> = new Map();

  constructor() {
    this.urlQueue = new URLQueueService();
    this.contentExtractor = new ContentExtractorService();
    this.authHandler = new AuthenticationHandler();
    this.structuredExtractor = new StructuredExtractor();
  }

  /**
   * Start domain crawling
   */
  async startDomainCrawl(startUrl: string, config: CrawlConfig): Promise<string> {
    const sessionId = uuidv4();
    const domain = this.extractDomain(startUrl);

    if (!domain) {
      throw new Error('Invalid URL provided');
    }

    // Create crawl session
    const session = new CrawlSession({
      sessionId,
      domain,
      startUrl,
      config,
      status: 'pending'
    });

    await session.save();

    // Initialize progress tracking
    this.crawlProgress.set(sessionId, {
      sessionId,
      status: 'pending',
      totalUrls: 0,
      processedUrls: 0,
      failedUrls: 0,
      extractedItems: 0,
      errors: []
    });

    // Start crawling process (non-blocking)
    this.executeCrawl(sessionId, startUrl, config).catch(error => {
      console.error(`Crawl session ${sessionId} failed:`, error);
      this.updateSessionStatus(sessionId, 'failed');
    });

    return sessionId;
  }

  /**
   * Execute the crawling process
   */
  private async executeCrawl(sessionId: string, startUrl: string, config: CrawlConfig): Promise<void> {
    const domain = this.extractDomain(startUrl);
    if (!domain) throw new Error('Invalid domain');

    try {
      // Update session status
      await this.updateSessionStatus(sessionId, 'running');

      // Check robots.txt if required
      let robotsRules: any = null;
      if (config.respectRobots) {
        try {
          robotsRules = await this.getRobotsRules(domain, config.userAgent);
        } catch (error) {
          console.warn(`Could not fetch robots.txt for ${domain}:`, error);
        }
      }

      // Initialize browser
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Create concurrent pages
      const pages: Page[] = [];
      for (let i = 0; i < config.concurrent; i++) {
        const page = await browser.newPage({
          userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        
        // Set timeout
        page.setDefaultTimeout(config.timeout || 30000);
        pages.push(page);
      }

      // Store browser and pages for cleanup
      this.activeCrawlers.set(sessionId, { browser, pages });

      // Add initial URL to queue
      await this.urlQueue.addUrl(sessionId, startUrl, 0, undefined, 10);

      // Initialize totalUrls count
      await CrawlSession.findOneAndUpdate(
        { sessionId },
        { $set: { 'stats.totalUrls': 1 } }
      );

      // Start crawling workers
      const workers = pages.map(page => this.crawlWorker(sessionId, page, domain, config, robotsRules));
      
      // Wait for all workers to complete
      await Promise.all(workers);

      // Cleanup
      await this.cleanup(sessionId);
      await this.updateSessionStatus(sessionId, 'completed');

      console.log(`✅ Crawl session ${sessionId} completed successfully`);

    } catch (error) {
      console.error(`Crawl execution failed for session ${sessionId}:`, error);
      await this.cleanup(sessionId);
      await this.updateSessionStatus(sessionId, 'failed');
      throw error;
    }
  }

  /**
   * Individual crawler worker
   */
  private async crawlWorker(
    sessionId: string,
    page: Page,
    domain: string,
    config: CrawlConfig,
    robotsRules: any
  ): Promise<void> {
    // Handle authentication if configured
    let isAuthenticated = false;
    if (config.authentication && config.authentication.type !== 'none') {
      console.log(`🔐 Attempting authentication for ${domain} using ${config.authentication.type}`);
      const authResult = await this.authHandler.authenticatePage(page, config.authentication, domain);
      if (authResult.success) {
        isAuthenticated = true;
        console.log(`✅ Authentication successful for ${domain}`);
      } else {
        console.error(`❌ Authentication failed for ${domain}:`, authResult.error);
        // If authentication is required but failed, we should not continue crawling
        // as we'll likely get access denied pages
        console.log(`🚫 Skipping crawling due to authentication failure`);
        return;
      }
    }

    while (true) {
      // Get next URL from queue
      const urlItem = await this.urlQueue.getNextUrl(sessionId);
      if (!urlItem) {
        // No more URLs to process
        await this.delay(1000); // Wait a bit before checking again
        
        // Check if there are any pending URLs
        const pendingCount = await this.urlQueue.getPendingCount(sessionId);
        if (pendingCount === 0) {
          break; // No more work to do
        }
        continue;
      }

      try {
        // Update progress
        this.updateProgress(sessionId, { currentUrl: urlItem.url });

        // Check robots.txt
        if (robotsRules && !robotsRules.isAllowed(urlItem.url)) {
          await this.urlQueue.markFailed(String(urlItem._id), 'Blocked by robots.txt');
          continue;
        }

        // Check depth limit
        if (urlItem.depth >= config.maxDepth) {
          await this.urlQueue.markCompleted(String(urlItem._id));
          continue;
        }

        // Check URL patterns
        if (!this.matchesPatterns(urlItem.url, config.includePatterns, config.excludePatterns)) {
          await this.urlQueue.markCompleted(String(urlItem._id));
          continue;
        }

        // Apply stored authentication if available
        if (isAuthenticated && !this.authHandler.isAuthenticated(domain)) {
          const authApplied = await this.authHandler.applyStoredAuth(page, domain);
          if (!authApplied) {
            // Re-authenticate if stored auth failed
            if (config.authentication && config.authentication.type !== 'none') {
              const authResult = await this.authHandler.authenticatePage(page, config.authentication, domain);
              if (!authResult.success) {
                console.warn(`Re-authentication failed for ${urlItem.url}`);
              }
            }
          }
        }

        // Crawl the page with error handling
        let html: string;
        try {
          html = await this.crawlPage(page, urlItem.url, config);
        } catch (crawlError) {
          console.error(`❌ Error crawling ${urlItem.url}: ${(crawlError as Error).message}`);
          await this.urlQueue.markFailed(String(urlItem._id), `Crawling failed: ${(crawlError as Error).message}`);
          continue;
        }

        // Extract content
        const extractedContent = await this.contentExtractor.extractContent(html, urlItem.url, domain);

        // Validate extracted content before saving
        if (!extractedContent.textContent || extractedContent.textContent.trim().length === 0) {
          console.warn(`⚠️ Empty text content for ${urlItem.url}, skipping...`);
          await this.urlQueue.markFailed(String(urlItem._id), 'Empty content extracted');
          continue;
        }

        // Store raw content
        const rawContent = new RawContent({
          sessionId,
          url: urlItem.url,
          contentHash: extractedContent.contentHash,
          htmlContent: extractedContent.htmlContent,
          textContent: extractedContent.textContent || ' ', // Ensure non-empty textContent
          markdownContent: extractedContent.markdownContent, // Clean Firecrawl-style markdown
          metadata: {
            title: extractedContent.title,
            description: extractedContent.description,
            keywords: extractedContent.keywords,
            contentType: extractedContent.contentType,
            charset: extractedContent.charset,
            language: extractedContent.language
          },
          extractedLinks: extractedContent.extractedLinks,
          images: extractedContent.images,
          contentChunks: extractedContent.contentChunks,
          processingStatus: 'raw'
        });

        await rawContent.save();

        // Phase 3: Structured Data Extraction
        if (config.extraction?.enableStructuredData) {
          try {
            console.log(`📊 Extracting structured data from ${urlItem.url}`);
            const structuredData = await this.structuredExtractor.extractStructuredData(rawContent, undefined);
            
            // Update raw content with structured data
            rawContent.metadata.extractedData = structuredData;
            rawContent.processingStatus = 'extracted';
            await rawContent.save();
            
            console.log(`✅ Structured data extracted: ${structuredData.schema} (Score: ${structuredData.qualityScore})`);
          } catch (error) {
            console.warn(`Failed to extract structured data from ${urlItem.url}:`, error);
          }
        }

        // Add discovered internal links to queue
        const newUrls = extractedContent.extractedLinks.internal
          .filter(url => this.urlQueue.isInternalUrl(url, domain))
          .map(url => ({
            url: this.urlQueue.normalizeUrl(url),
            depth: urlItem.depth + 1,
            parentUrl: urlItem.url,
            priority: this.calculatePriority(url, urlItem.depth + 1)
          }));

        if (newUrls.length > 0) {
          await this.urlQueue.addUrls(sessionId, newUrls);
          // Update total URLs count
          await CrawlSession.findOneAndUpdate(
            { sessionId },
            { $inc: { 'stats.totalUrls': newUrls.length } }
          );
        }

        // Mark URL as completed
        await this.urlQueue.markCompleted(String(urlItem._id));

        // Update progress in memory
        this.updateProgress(sessionId, {
          processedUrls: (this.crawlProgress.get(sessionId)?.processedUrls || 0) + 1,
          extractedItems: (this.crawlProgress.get(sessionId)?.extractedItems || 0) + extractedContent.contentChunks.length
        });

        // Update session stats in database
        await CrawlSession.findOneAndUpdate(
          { sessionId },
          {
            $inc: {
              'stats.processedUrls': 1,
              'stats.extractedItems': extractedContent.contentChunks.length
            }
          }
        );

        // Respect delay
        if (config.delay > 0) {
          await this.delay(config.delay);
        }

      } catch (error) {
        console.error(`Error crawling ${urlItem.url}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.urlQueue.markFailed(String(urlItem._id), errorMessage);
        
        // Update progress in memory
        this.updateProgress(sessionId, {
          failedUrls: (this.crawlProgress.get(sessionId)?.failedUrls || 0) + 1,
          errors: [...(this.crawlProgress.get(sessionId)?.errors || []), `${urlItem.url}: ${errorMessage}`]
        });

        // Update session stats in database
        await CrawlSession.findOneAndUpdate(
          { sessionId },
          { $inc: { 'stats.failedUrls': 1 } }
        );
      }

      // Check if we've reached the page limit
      const stats = await this.urlQueue.getQueueStats(sessionId);
      if (stats.completed >= config.maxPages) {
        break;
      }
    }
  }

  /**
   * Crawl a single page with error handling and retries
   * Uses different scraping strategies based on config
   */
  private async crawlPage(page: Page, url: string, config: CrawlConfig, maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌐 Attempting to load ${url} (attempt ${attempt}/${maxRetries})`);

        // Choose strategy based on config
        let html: string;
        
        if (config.forceMethod === 'static' || !config.enableDynamicScraping) {
          // Use static scraping (fast, but may miss dynamic content)
          const response = await fetch(url, {
            headers: {
              'User-Agent': config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          html = await response.text();
        } else if (config.enableStealthScraping && (config.forceMethod === 'stealth' || config.stealthLevel === 'maximum')) {
          // Use stealth mode with Playwright
          await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: config.timeout || 30000
          });
          await page.waitForTimeout(2000); // Wait for dynamic content
          html = await page.content();
        } else {
          // Default: Use Playwright with standard settings
          await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: config.timeout || 30000
          });
          await page.waitForTimeout(1000); // Wait a bit for dynamic content
          html = await page.content();
        }

        // Basic validation - ensure we have substantial content
        if (html.length < 1000) {
          throw new Error(`Page content too small (${html.length} chars), likely blocked or error page`);
        }

        // Check for blocking indicators
        const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
        if (title.toLowerCase().includes('access denied') ||
            title.toLowerCase().includes('blocked') ||
            title.toLowerCase().includes('captcha')) {
          throw new Error(`Page appears to be blocked: ${title}`);
        }

        console.log(`✅ Successfully loaded ${url} (${html.length} chars)`);
        return html;

      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt} failed for ${url}: ${lastError.message}`);

        if (attempt < maxRetries) {
          // Wait before retrying with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }

    // All attempts failed
    throw new Error(`Failed to load ${url} after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Get robots.txt rules
   */
  private async getRobotsRules(domain: string, userAgent: string = '*'): Promise<any> {
    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      // Simple robots.txt fetch - will implement proper robots checker later
      const response = await fetch(robotsUrl);
      if (response.ok) {
        const robotsContent = await response.text();
        return robotsParser(robotsUrl, robotsContent);
      }
    } catch (error) {
      console.warn(`Could not fetch robots.txt for ${domain}:`, error);
    }
    
    return null;
  }

  /**
   * Calculate URL priority based on depth and URL characteristics
   */
  private calculatePriority(url: string, depth: number): number {
    let priority = 10 - depth; // Higher priority for shallower pages
    
    // Boost priority for important pages
    const importantPatterns = ['/about', '/contact', '/products', '/services', '/blog'];
    if (importantPatterns.some(pattern => url.includes(pattern))) {
      priority += 5;
    }
    
    // Lower priority for less important pages
    const lowPriorityPatterns = ['/tag/', '/category/', '/archive/', '/page/'];
    if (lowPriorityPatterns.some(pattern => url.includes(pattern))) {
      priority -= 3;
    }
    
    return Math.max(0, priority);
  }

  /**
   * Check if URL matches include/exclude patterns
   */
  private matchesPatterns(url: string, includePatterns: string[], excludePatterns: string[]): boolean {
    // Check exclude patterns first
    if (excludePatterns.length > 0) {
      for (const pattern of excludePatterns) {
        if (url.includes(pattern) || new RegExp(pattern).test(url)) {
          return false;
        }
      }
    }
    
    // Check include patterns
    if (includePatterns.length > 0) {
      for (const pattern of includePatterns) {
        if (url.includes(pattern) || new RegExp(pattern).test(url)) {
          return true;
        }
      }
      return false; // If include patterns exist but none match
    }
    
    return true; // No patterns or passed all checks
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(sessionId: string, status: ICrawlSession['status']): Promise<void> {
    await CrawlSession.findOneAndUpdate(
      { sessionId },
      { 
        status,
        ...(status === 'completed' && { 'stats.endTime': new Date() })
      }
    );

    // Update progress tracking
    const progress = this.crawlProgress.get(sessionId);
    if (progress) {
      progress.status = status;
      this.crawlProgress.set(sessionId, progress);
    }
  }

  /**
   * Update crawl progress
   */
  private updateProgress(sessionId: string, updates: Partial<CrawlProgress>): void {
    const progress = this.crawlProgress.get(sessionId);
    if (progress) {
      Object.assign(progress, updates);
      this.crawlProgress.set(sessionId, progress);
    }
  }

  /**
   * Get crawl progress
   */
  async getCrawlProgress(sessionId: string): Promise<CrawlProgress | null> {
    const progress = this.crawlProgress.get(sessionId);
    if (progress) {
      // Update with latest queue stats
      const queueStats = await this.urlQueue.getQueueStats(sessionId);
      progress.totalUrls = queueStats.total;
      progress.processedUrls = queueStats.completed;
      progress.failedUrls = queueStats.failed;
      
      return progress;
    }
    
    return null;
  }

  /**
   * Pause crawl session
   */
  async pauseCrawl(sessionId: string): Promise<void> {
    await this.updateSessionStatus(sessionId, 'paused');
    await this.cleanup(sessionId);
  }

  /**
   * Resume crawl session
   */
  async resumeCrawl(sessionId: string): Promise<void> {
    const session = await CrawlSession.findOne({ sessionId });
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'paused') {
      throw new Error('Session is not paused');
    }

    // Restart the crawl process
    this.executeCrawl(sessionId, session.startUrl, session.config).catch(error => {
      console.error(`Resume crawl session ${sessionId} failed:`, error);
      this.updateSessionStatus(sessionId, 'failed');
    });
  }

  /**
   * Stop crawl session
   */
  async stopCrawl(sessionId: string): Promise<void> {
    await this.updateSessionStatus(sessionId, 'failed');
    await this.cleanup(sessionId);
  }

  /**
   * Cleanup resources
   */
  private async cleanup(sessionId: string): Promise<void> {
    const crawler = this.activeCrawlers.get(sessionId);
    if (crawler) {
      try {
        // Close all pages
        await Promise.all(crawler.pages.map(page => page.close()));
        // Close browser
        await crawler.browser.close();
      } catch (error) {
        console.error(`Error cleaning up crawler ${sessionId}:`, error);
      }
      
      this.activeCrawlers.delete(sessionId);
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<ICrawlSession | null> {
    return await CrawlSession.findOne({ sessionId });
  }

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<ICrawlSession[]> {
    return await CrawlSession.find().sort({ createdAt: -1 });
  }

  /**
   * Delete session and associated data
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Stop crawl if running
    await this.stopCrawl(sessionId);
    
    // Delete session data
    await CrawlSession.deleteOne({ sessionId });
    await RawContent.deleteMany({ sessionId });
    
    // Clean up queue
    await this.urlQueue.cleanupOldUrls(sessionId, 0);
    
    // Remove from progress tracking
    this.crawlProgress.delete(sessionId);
  }


} 