import { StaticScraper, ScrapedContent } from './staticScraper';
import { DynamicScraper } from './dynamicScraper';
import { ApiScraper, ApiScrapedData } from './apiScraper';
import { RobotsChecker, RobotsInfo } from './robotsChecker';
import { AdaptiveScraper, AdaptiveScrapingResult } from './adaptiveScraper';
import { StealthScraper } from './stealthScraper';

export interface ScrapingStrategy {
  method: 'static' | 'dynamic' | 'stealth' | 'adaptive' | 'api' | 'hybrid';
  confidence: number;
  reasons: string[];
  estimatedTime: number; // in seconds
}

export interface IntelligentScrapedData extends ScrapedContent {
  strategy: ScrapingStrategy;
  robotsInfo: RobotsInfo;
  performanceMetrics: {
    totalTime: number;
    staticTime?: number;
    dynamicTime?: number;
    apiTime?: number;
    methodsAttempted: string[];
  };
  apiData?: ApiScrapedData;
  qualityScore: number;
  completenessScore: number;
  additionalContent?: {
    dynamicContent?: string;
    apiContent?: any[];
    structuredData?: any;
  };
}

export interface IntelligentScrapeOptions {
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

export class IntelligentScraper {
  private staticScraper: StaticScraper;
  private dynamicScraper: DynamicScraper;
  private adaptiveScraper: AdaptiveScraper;

  constructor() {
    this.staticScraper = new StaticScraper();
    this.dynamicScraper = new DynamicScraper();
    this.adaptiveScraper = AdaptiveScraper.getInstance(); // Use singleton
  }

  async scrape(url: string, options: IntelligentScrapeOptions = {}): Promise<IntelligentScrapedData> {
    const startTime = Date.now();
    const defaultOptions: Required<IntelligentScrapeOptions> = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      timeout: 30000,
      maxRetries: 2,
      forceMethod: undefined as any,
      enableApiScraping: true,
      enableDynamicScraping: true,
      enableStealthScraping: true,
      enableAdaptiveScraping: true,
      respectRobots: false, // Log but don't enforce
      qualityThreshold: 70,
      captchaSolver: 'skip',
      captchaApiKey: '',
      stealthLevel: 'advanced',
      learningMode: true
    };

    const config = { ...defaultOptions, ...options };
    const methodsAttempted: string[] = [];
    let finalResult: IntelligentScrapedData;

    console.log(`🧠 Starting intelligent scraping for: ${url}`);

    // Step 1: Check robots.txt (log but don't enforce)
    console.log('🤖 Checking robots.txt...');
    const robotsInfo = await RobotsChecker.checkRobots(url, config.userAgent);
    console.log(`📋 Robots.txt policy: ${robotsInfo.isAllowed ? 'ALLOWED' : 'BLOCKED'} (${robotsInfo.error || 'No issues'})`);
    
    if (!robotsInfo.isAllowed) {
      console.log('⚠️ Warning: robots.txt disallows scraping, but proceeding as requested');
    }

    // Check if adaptive scraping is enabled and should be used
    if (config.enableAdaptiveScraping && (!config.forceMethod || config.forceMethod === 'adaptive')) {
      console.log('🧠 Using adaptive scraping strategy...');
      methodsAttempted.push('adaptive');
      
      try {
        const adaptiveResult = await this.adaptiveScraper.scrape(url, {
          maxRetries: config.maxRetries,
          timeout: config.timeout,
          captchaSolver: config.captchaSolver,
          captchaApiKey: config.captchaApiKey,
          learningMode: config.learningMode,
          forceMethod: config.forceMethod === 'adaptive' ? undefined : config.forceMethod
        });

        const totalTime = Date.now() - startTime;
        console.log(`✅ Adaptive scraping completed in ${totalTime}ms using ${adaptiveResult.strategy.type} method`);

        return this.createFinalResult(adaptiveResult, robotsInfo, {
          method: 'adaptive',
          confidence: adaptiveResult.strategy.confidence,
          reasons: [`Adaptive strategy: ${adaptiveResult.strategy.type}`, ...adaptiveResult.adaptations],
          estimatedTime: totalTime / 1000
        }, methodsAttempted, { totalTime }, undefined, {
          adaptiveResult: adaptiveResult
        });

      } catch (adaptiveError) {
        console.warn('⚠️ Adaptive scraping failed, falling back to traditional methods:', adaptiveError);
        
        // If adaptive was forced and failed, don't continue with other methods
        if (config.forceMethod === 'adaptive') {
          throw adaptiveError;
        }
      }
    }

    // Step 2: Attempt static scraping first (if not using adaptive)
    console.log('📄 Attempting static scraping...');
    const staticStartTime = Date.now();
    methodsAttempted.push('static');

    try {
      const staticResult = await this.staticScraper.scrape(url, {
        userAgent: config.userAgent,
        timeout: config.timeout
      });

      const staticTime = Date.now() - staticStartTime;
      console.log(`✅ Static scraping completed in ${staticTime}ms`);

      // Analyze static content quality
      const staticQuality = this.analyzeContentQuality(staticResult);
      console.log(`📊 Static content quality: ${staticQuality.score}% (${staticQuality.wordCount} words)`);

      // Check if we need dynamic scraping
      const dynamicAnalysis = await DynamicScraper.needsDynamicScraping(url, staticResult.content);
      console.log(`🔍 Dynamic scraping analysis: ${dynamicAnalysis.needsDynamic ? 'NEEDED' : 'NOT NEEDED'} (confidence: ${dynamicAnalysis.confidence}%)`);
      
      if (dynamicAnalysis.reasons.length > 0) {
        console.log(`   Reasons: ${dynamicAnalysis.reasons.join(', ')}`);
      }

      // Decide strategy based on analysis and force method
      if (config.forceMethod === 'static' || 
          (!config.forceMethod && !config.enableDynamicScraping && staticQuality.score >= config.qualityThreshold)) {
        
        finalResult = this.createFinalResult(staticResult, robotsInfo, {
          method: 'static',
          confidence: staticQuality.score,
          reasons: ['Static content sufficient', `Quality score: ${staticQuality.score}%`],
          estimatedTime: staticTime / 1000
        }, methodsAttempted, { staticTime });

      } else if ((config.forceMethod === 'dynamic' || config.forceMethod === 'stealth') || 
                 (dynamicAnalysis.needsDynamic && config.enableDynamicScraping)) {
        // Step 3: Attempt dynamic scraping
        console.log('🎭 Attempting dynamic scraping...');
        const dynamicStartTime = Date.now();
        methodsAttempted.push('dynamic');

        try {
          // If stealth is forced, skip dynamic and go straight to stealth
          if (config.forceMethod === 'stealth') {
            throw new Error('Skipping dynamic scraping - stealth method forced');
          }
          
          const dynamicResult = await this.dynamicScraper.scrape(url, {
            userAgent: config.userAgent,
            timeout: config.timeout,
            waitForNetworkIdle: true
          });

          const dynamicTime = Date.now() - dynamicStartTime;
          console.log(`✅ Dynamic scraping completed in ${dynamicTime}ms`);

          const dynamicQuality = this.analyzeContentQuality(dynamicResult.content);
          console.log(`📊 Dynamic content quality: ${dynamicQuality.score}% (${dynamicQuality.wordCount} words)`);

          // Check for API endpoints
          let apiData: ApiScrapedData | undefined;
          if (config.enableApiScraping && dynamicResult.networkRequests.length > 0) {
            console.log('🔌 Analyzing API endpoints...');
            const apiStartTime = Date.now();
            methodsAttempted.push('api');

            const apiEndpoints = ApiScraper.analyzeNetworkRequests(dynamicResult.networkRequests);
            console.log(`📡 Found ${apiEndpoints.length} potential API endpoints`);

            if (apiEndpoints.length > 0) {
              apiData = await ApiScraper.scrapeApiEndpoints(apiEndpoints, url);
              const apiTime = Date.now() - apiStartTime;
              console.log(`✅ API scraping completed in ${apiTime}ms, extracted ${apiData.totalDataPoints} data points`);
            }
          }

          // Combine results for hybrid approach
          const combinedContent = this.combineContent(staticResult, dynamicResult.content, apiData);
          const combinedQuality = this.analyzeContentQuality(combinedContent);

          finalResult = this.createFinalResult(combinedContent, robotsInfo, {
            method: apiData ? 'hybrid' : 'dynamic',
            confidence: combinedQuality.score,
            reasons: [
              `Dynamic rendering improved content`,
              `Quality score: ${combinedQuality.score}%`,
              ...(apiData ? [`API data: ${apiData.totalDataPoints} points`] : [])
            ],
            estimatedTime: (Date.now() - startTime) / 1000
          }, methodsAttempted, { 
            staticTime, 
            dynamicTime,
            ...(apiData && { apiTime: Date.now() - dynamicStartTime })
          }, apiData, {
            dynamicContent: dynamicResult.content.content,
            apiContent: apiData?.extractedData,
            structuredData: apiData?.structuredContent
          });

        } catch (dynamicError) {
          console.warn('⚠️ Dynamic scraping failed:', dynamicError);
          
          // Fallback to static result
          finalResult = this.createFinalResult(staticResult, robotsInfo, {
            method: 'static',
            confidence: staticQuality.score,
            reasons: ['Dynamic scraping failed', 'Fallback to static content'],
            estimatedTime: staticTime / 1000
          }, methodsAttempted, { staticTime });
        }

      } else {
        // Use static result
        finalResult = this.createFinalResult(staticResult, robotsInfo, {
          method: 'static',
          confidence: staticQuality.score,
          reasons: ['Static content sufficient'],
          estimatedTime: staticTime / 1000
        }, methodsAttempted, { staticTime });
      }

    } catch (staticError) {
      console.error('❌ Static scraping failed:', staticError);
      
      if (config.enableDynamicScraping) {
        // Try dynamic as fallback
        console.log('🎭 Falling back to dynamic scraping...');
        const dynamicStartTime = Date.now();
        methodsAttempted.push('dynamic');

        try {
          const dynamicResult = await this.dynamicScraper.scrape(url, {
            userAgent: config.userAgent,
            timeout: config.timeout
          });

          const dynamicTime = Date.now() - dynamicStartTime;
          const dynamicQuality = this.analyzeContentQuality(dynamicResult.content);

          finalResult = this.createFinalResult(dynamicResult.content, robotsInfo, {
            method: 'dynamic',
            confidence: dynamicQuality.score,
            reasons: ['Static scraping failed', 'Dynamic scraping successful'],
            estimatedTime: dynamicTime / 1000
          }, methodsAttempted, { dynamicTime });

        } catch (dynamicError: any) {
          // Try stealth scraping as final fallback
          if (config.enableStealthScraping) {
            console.log('🥷 Falling back to stealth scraping...');
            const stealthStartTime = Date.now();
            methodsAttempted.push('stealth');

            try {
              const stealthScraper = new StealthScraper();
              const stealthResult = await stealthScraper.scrape(url, {
                timeout: config.timeout,
                maxRetries: config.maxRetries,
                captchaSolver: config.captchaSolver,
                captchaApiKey: config.captchaApiKey,
                stealthLevel: config.stealthLevel,
                humanBehavior: true,
                sessionPersistence: true
              });

              const stealthTime = Date.now() - stealthStartTime;
              const stealthQuality = this.analyzeContentQuality(stealthResult.content);

              finalResult = this.createFinalResult(stealthResult.content, robotsInfo, {
                method: 'stealth',
                confidence: stealthQuality.score,
                reasons: ['Static and dynamic scraping failed', 'Stealth scraping successful'],
                estimatedTime: stealthTime / 1000
              }, methodsAttempted, { stealthTime });

              await stealthScraper.cleanup();

            } catch (stealthError: any) {
              throw new Error(`All scraping methods failed. Static: ${(staticError as Error).message}, Dynamic: ${dynamicError.message}, Stealth: ${stealthError.message}`);
            }
          } else {
            throw new Error(`All scraping methods failed. Static: ${(staticError as Error).message}, Dynamic: ${dynamicError.message}`);
          }
        }
      } else {
        throw staticError;
      }
    }

    const totalTime = Date.now() - startTime;
    finalResult.performanceMetrics.totalTime = totalTime;

    console.log(`🎉 Intelligent scraping completed in ${totalTime}ms using ${finalResult.strategy.method} method`);
    console.log(`📈 Final quality score: ${finalResult.qualityScore}%, completeness: ${finalResult.completenessScore}%`);

    return finalResult;
  }

  private analyzeContentQuality(content: ScrapedContent): { score: number; wordCount: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Word count scoring
    const wordCount = content.wordCount;
    if (wordCount > 1000) {
      score += 30;
      reasons.push('Rich content (1000+ words)');
    } else if (wordCount > 500) {
      score += 20;
      reasons.push('Moderate content (500+ words)');
    } else if (wordCount > 100) {
      score += 10;
      reasons.push('Basic content (100+ words)');
    } else {
      reasons.push('Minimal content (<100 words)');
    }

    // Title quality
    if (content.title && content.title !== 'No title found' && content.title.length > 10) {
      score += 15;
      reasons.push('Good title');
    }

    // Description quality
    if (content.description && content.description.length > 50) {
      score += 10;
      reasons.push('Good description');
    }

    // Links scoring
    if (content.links.length > 10) {
      score += 15;
      reasons.push('Rich link structure');
    } else if (content.links.length > 5) {
      score += 10;
      reasons.push('Moderate links');
    }

    // Images scoring
    if (content.images.length > 5) {
      score += 10;
      reasons.push('Rich media content');
    } else if (content.images.length > 0) {
      score += 5;
      reasons.push('Some media content');
    }

    // Headings structure
    if (content.headings.length > 5) {
      score += 10;
      reasons.push('Good content structure');
    } else if (content.headings.length > 0) {
      score += 5;
      reasons.push('Basic structure');
    }

    // Metadata completeness
    const metadataFields = Object.values(content.metadata).filter(Boolean).length;
    if (metadataFields > 5) {
      score += 10;
      reasons.push('Rich metadata');
    } else if (metadataFields > 2) {
      score += 5;
      reasons.push('Basic metadata');
    }

    return { score: Math.min(score, 100), wordCount, reasons };
  }

  private combineContent(staticContent: ScrapedContent, dynamicContent: ScrapedContent, apiData?: ApiScrapedData): ScrapedContent {
    // Use the content with more words as base
    const baseContent = dynamicContent.wordCount > staticContent.wordCount ? dynamicContent : staticContent;
    
    // Combine unique links
    const allLinks = [...staticContent.links, ...dynamicContent.links];
    const uniqueLinks = allLinks.filter((link, index, self) => 
      index === self.findIndex(l => l.href === link.href)
    );

    // Combine unique images
    const allImages = [...staticContent.images, ...dynamicContent.images];
    const uniqueImages = allImages.filter((img, index, self) => 
      index === self.findIndex(i => i.src === img.src)
    );

    // Combine headings
    const allHeadings = [...staticContent.headings, ...dynamicContent.headings];
    const uniqueHeadings = allHeadings.filter((heading, index, self) => 
      index === self.findIndex(h => h.text === heading.text && h.level === heading.level)
    );

    // Merge metadata
    const combinedMetadata = {
      ...staticContent.metadata,
      ...dynamicContent.metadata
    };

    // If we have API data, enhance the content
    let enhancedContent = baseContent.content;
    if (apiData && apiData.structuredContent) {
      const apiContent = this.extractApiContent(apiData);
      if (apiContent) {
        enhancedContent += '\n\n' + apiContent;
      }
    }

    return {
      ...baseContent,
      content: enhancedContent,
      links: uniqueLinks.slice(0, 150), // Limit to prevent bloat
      images: uniqueImages.slice(0, 75),
      headings: uniqueHeadings,
      metadata: combinedMetadata,
      wordCount: enhancedContent.split(/\s+/).filter(word => word.length > 0).length
    };
  }

  private extractApiContent(apiData: ApiScrapedData): string {
    let content = '';

    // Extract content from articles
    if (apiData.structuredContent.articles && apiData.structuredContent.articles.length > 0) {
      content += apiData.structuredContent.articles
        .map(article => {
          const title = article.title || article.name || article.headline || '';
          const body = article.content || article.body || article.text || article.description || '';
          return title && body ? `${title}\n${body}` : body;
        })
        .filter(Boolean)
        .join('\n\n');
    }

    // Extract content from products
    if (apiData.structuredContent.products && apiData.structuredContent.products.length > 0) {
      const productContent = apiData.structuredContent.products
        .map(product => {
          const name = product.name || product.title || '';
          const desc = product.description || product.summary || '';
          return name && desc ? `${name}: ${desc}` : desc;
        })
        .filter(Boolean)
        .join('\n');
      
      if (productContent) {
        content += (content ? '\n\n' : '') + productContent;
      }
    }

    return content;
  }

  private createFinalResult(
    content: ScrapedContent,
    robotsInfo: RobotsInfo,
    strategy: ScrapingStrategy,
    methodsAttempted: string[],
    timings: any,
    apiData?: ApiScrapedData,
    additionalContent?: any
  ): IntelligentScrapedData {
    const qualityAnalysis = this.analyzeContentQuality(content);
    
    return {
      ...content,
      strategy,
      robotsInfo,
      performanceMetrics: {
        totalTime: 0, // Will be set later
        methodsAttempted,
        ...timings
      },
      apiData,
      qualityScore: qualityAnalysis.score,
      completenessScore: this.calculateCompletenessScore(content, apiData),
      additionalContent
    };
  }

  private calculateCompletenessScore(content: ScrapedContent, apiData?: ApiScrapedData): number {
    let score = 0;

    // Base content scoring
    if (content.title && content.title !== 'No title found') score += 20;
    if (content.description) score += 15;
    if (content.content && content.wordCount > 100) score += 25;
    if (content.links.length > 0) score += 10;
    if (content.images.length > 0) score += 10;
    if (content.headings.length > 0) score += 10;

    // API data bonus
    if (apiData && apiData.totalDataPoints > 0) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.dynamicScraper.close(),
      this.adaptiveScraper.cleanup()
    ]);
  }

  // Additional methods for advanced scraping management
  getAdaptiveStats(domain?: string) {
    return this.adaptiveScraper.getProfileStats(domain);
  }

  getSuccessRates() {
    return this.adaptiveScraper.getSuccessRateStats();
  }

  clearAdaptiveProfile(domain: string) {
    this.adaptiveScraper.clearProfile(domain);
  }

  exportAdaptiveProfiles() {
    return this.adaptiveScraper.exportProfiles();
  }

  importAdaptiveProfiles(data: string) {
    this.adaptiveScraper.importProfiles(data);
  }
}

export default IntelligentScraper; 