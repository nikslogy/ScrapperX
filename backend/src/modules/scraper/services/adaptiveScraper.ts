import { StealthScraper, StealthScrapeOptions } from './stealthScraper';
import { DynamicScraper } from './dynamicScraper';
import { StaticScraper, ScrapedContent } from './staticScraper';
import { RobotsChecker } from './robotsChecker';

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
  optimalStrategy: ScrapingMethod;
  lastUpdated: Date;
  totalAttempts: number;
  recentFailures: string[];
}

export interface ScrapingMethod {
  type: 'static' | 'dynamic' | 'stealth';
  confidence: number;
  options: any;
}

export interface AdaptiveScrapingResult extends ScrapedContent {
  strategy: ScrapingMethod;
  profile: WebsiteProfile;
  adaptations: string[];
  performanceMetrics: {
    totalTime: number;
    methodTime: number;
    retries: number;
    adaptationTime: number;
  };
}

export class AdaptiveScraper {
  private static instance: AdaptiveScraper;
  private static profiles: Map<string, WebsiteProfile> = new Map();
  private staticScraper: StaticScraper;
  private dynamicScraper: DynamicScraper;
  private stealthScraper: StealthScraper;

  constructor() {
    this.staticScraper = new StaticScraper();
    this.dynamicScraper = new DynamicScraper();
    this.stealthScraper = new StealthScraper();
  }

  // Singleton pattern to ensure profiles persist
  public static getInstance(): AdaptiveScraper {
    if (!AdaptiveScraper.instance) {
      AdaptiveScraper.instance = new AdaptiveScraper();
    }
    return AdaptiveScraper.instance;
  }

  async scrape(url: string, options: {
    maxRetries?: number;
    timeout?: number;
    forceMethod?: 'static' | 'dynamic' | 'stealth';
    learningMode?: boolean;
    captchaSolver?: 'manual' | '2captcha' | 'anticaptcha' | 'skip';
    captchaApiKey?: string;
  } = {}): Promise<AdaptiveScrapingResult> {
    const startTime = Date.now();
    const domain = new URL(url).hostname;
    const adaptations: string[] = [];

    console.log(`🧠 Starting adaptive scraping for: ${url}`);

    // Get or create website profile
    let profile = this.getOrCreateProfile(domain);
    console.log(`📊 Website profile - Difficulty: ${profile.characteristics.difficulty}, Optimal: ${profile.optimalStrategy.type}`);

    // Determine scraping strategy
    const strategy = options.forceMethod ? 
      { type: options.forceMethod, confidence: 100, options: {} } :
      this.determineOptimalStrategy(profile, url);

    console.log(`🎯 Selected strategy: ${strategy.type} (confidence: ${strategy.confidence}%)`);

    let result: AdaptiveScrapingResult;
    let methodStartTime = Date.now();

    try {
      switch (strategy.type) {
        case 'static':
          result = await this.scrapeWithStatic(url, strategy, profile, adaptations);
          break;
        case 'dynamic':
          result = await this.scrapeWithDynamic(url, strategy, profile, adaptations);
          break;
        case 'stealth':
          result = await this.scrapeWithStealth(url, strategy, profile, adaptations, options);
          break;
        default:
          throw new Error(`Unknown strategy: ${strategy.type}`);
      }

      // Update success metrics
      this.updateProfileSuccess(profile, strategy.type);
      
    } catch (error: any) {
      console.error(`❌ Primary strategy ${strategy.type} failed:`, error.message);
      
      // Update failure metrics
      this.updateProfileFailure(profile, strategy.type, error.message);
      
      // Try fallback strategies
      result = await this.tryFallbackStrategies(url, strategy, profile, adaptations, options, error);
    }

    const totalTime = Date.now() - startTime;
    const methodTime = Date.now() - methodStartTime;

    // Update profile and save learning
    profile.lastUpdated = new Date();
    profile.totalAttempts++;
    AdaptiveScraper.profiles.set(domain, profile);

    // Finalize result
    result.performanceMetrics = {
      totalTime,
      methodTime,
      retries: 0,
      adaptationTime: totalTime - methodTime
    };

    console.log(`✅ Adaptive scraping completed in ${totalTime}ms using ${result.strategy.type}`);
    console.log(`📈 Adaptations applied: ${adaptations.length > 0 ? adaptations.join(', ') : 'None'}`);

    return result;
  }

  private getOrCreateProfile(domain: string): WebsiteProfile {
    let profile = AdaptiveScraper.profiles.get(domain);
    
    if (!profile) {
      profile = {
        domain,
        characteristics: {
          hasAntiBot: false,
          requiresJS: false,
          hasRateLimit: false,
          hasCaptcha: false,
          difficulty: 'easy'
        },
        successRates: {
          static: 0,
          dynamic: 0,
          stealth: 0
        },
        optimalStrategy: { type: 'static', confidence: 80, options: {} },
        lastUpdated: new Date(),
        totalAttempts: 0,
        recentFailures: []
      };
      AdaptiveScraper.profiles.set(domain, profile);
    }

    return profile;
  }

  private determineOptimalStrategy(profile: WebsiteProfile, url: string): ScrapingMethod {
    const { characteristics, successRates } = profile;

    // If we have success rate data, use it
    if (profile.totalAttempts > 5) {
      const bestMethod = Object.entries(successRates).reduce((a, b) => 
        successRates[a[0] as keyof typeof successRates] > successRates[b[0] as keyof typeof successRates] ? a : b
      )[0] as 'static' | 'dynamic' | 'stealth';

      if (successRates[bestMethod] > 0.7) {
        return {
          type: bestMethod,
          confidence: Math.round(successRates[bestMethod] * 100),
          options: this.getMethodOptions(bestMethod, characteristics)
        };
      }
    }

    // Heuristic-based strategy selection
    let score = { static: 70, dynamic: 50, stealth: 30 };

    // Adjust based on characteristics
    if (characteristics.hasAntiBot) {
      score.static -= 40;
      score.dynamic -= 20;
      score.stealth += 30;
    }

    if (characteristics.requiresJS) {
      score.static -= 30;
      score.dynamic += 20;
      score.stealth += 10;
    }

    if (characteristics.hasCaptcha) {
      score.static -= 50;
      score.dynamic -= 30;
      score.stealth += 40;
    }

    if (characteristics.hasRateLimit) {
      score.static -= 20;
      score.dynamic -= 10;
      score.stealth += 20;
    }

    // Domain-specific heuristics
    const domainLower = profile.domain.toLowerCase();
    if (domainLower.includes('cloudflare') || domainLower.includes('ddos-guard')) {
      score.stealth += 30;
      score.static -= 30;
    }

    if (domainLower.includes('spa') || domainLower.includes('react') || domainLower.includes('angular')) {
      score.dynamic += 20;
      score.static -= 20;
    }

    // Select best strategy
    const bestStrategy = Object.entries(score).reduce((a, b) => a[1] > b[1] ? a : b);
    const strategyType = bestStrategy[0] as 'static' | 'dynamic' | 'stealth';

    return {
      type: strategyType,
      confidence: Math.min(bestStrategy[1], 95),
      options: this.getMethodOptions(strategyType, characteristics)
    };
  }

  private getMethodOptions(method: 'static' | 'dynamic' | 'stealth', characteristics: any): any {
    switch (method) {
      case 'static':
        return {
          timeout: characteristics.hasRateLimit ? 45000 : 30000,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
      
      case 'dynamic':
        return {
          timeout: characteristics.hasRateLimit ? 60000 : 30000,
          waitForNetworkIdle: characteristics.requiresJS,
          blockImages: true,
          blockCSS: false
        };
      
      case 'stealth':
        return {
          timeout: characteristics.hasRateLimit ? 90000 : 45000,
          stealthLevel: characteristics.hasAntiBot ? 'maximum' : 'advanced',
          humanBehavior: true,
          sessionPersistence: true,
          rateLimitDelay: characteristics.hasRateLimit ? 5000 : 1000
        };
      
      default:
        return {};
    }
  }

  private async scrapeWithStatic(
    url: string, 
    strategy: ScrapingMethod, 
    profile: WebsiteProfile, 
    adaptations: string[]
  ): Promise<AdaptiveScrapingResult> {
    console.log('📄 Executing static scraping strategy...');
    
    const result = await this.staticScraper.scrape(url, strategy.options);
    
    // Analyze result quality
    const quality = this.analyzeContentQuality(result);
    if (quality.score < 50) {
      adaptations.push('Low quality content detected');
      profile.characteristics.requiresJS = true;
    }

    return {
      ...result,
      strategy,
      profile,
      adaptations
    } as AdaptiveScrapingResult;
  }

  private async scrapeWithDynamic(
    url: string, 
    strategy: ScrapingMethod, 
    profile: WebsiteProfile, 
    adaptations: string[]
  ): Promise<AdaptiveScrapingResult> {
    console.log('🎭 Executing dynamic scraping strategy...');
    
    const result = await this.dynamicScraper.scrape(url, strategy.options);
    
    // Check for anti-bot indicators in the result
    if (result.content.content.toLowerCase().includes('blocked') || 
        result.content.content.toLowerCase().includes('forbidden')) {
      adaptations.push('Anti-bot protection detected');
      profile.characteristics.hasAntiBot = true;
    }

    return {
      ...result.content,
      strategy,
      profile,
      adaptations
    } as AdaptiveScrapingResult;
  }

  private async scrapeWithStealth(
    url: string, 
    strategy: ScrapingMethod, 
    profile: WebsiteProfile, 
    adaptations: string[],
    options: any
  ): Promise<AdaptiveScrapingResult> {
    console.log('🥷 Executing stealth scraping strategy...');
    
    const stealthOptions: StealthScrapeOptions = {
      ...strategy.options,
      captchaSolver: options.captchaSolver || 'skip',
      captchaApiKey: options.captchaApiKey
    };
    
    const result = await this.stealthScraper.scrape(url, stealthOptions);
    
    // Update profile based on stealth results
    if (result.antiDetection.detected) {
      adaptations.push(`Anti-bot measures detected: ${result.antiDetection.indicators.join(', ')}`);
      profile.characteristics.hasAntiBot = true;
      profile.characteristics.difficulty = result.antiDetection.confidence > 70 ? 'extreme' : 'hard';
    }

    if (result.captcha.type !== 'none') {
      adaptations.push(`CAPTCHA challenge: ${result.captcha.type}`);
      profile.characteristics.hasCaptcha = true;
    }

    return {
      ...result.content,
      strategy,
      profile,
      adaptations
    } as AdaptiveScrapingResult;
  }

  private async tryFallbackStrategies(
    url: string,
    failedStrategy: ScrapingMethod,
    profile: WebsiteProfile,
    adaptations: string[],
    options: any,
    originalError: Error
  ): Promise<AdaptiveScrapingResult> {
    console.log('🔄 Trying fallback strategies...');
    
    const fallbackOrder = this.getFallbackOrder(failedStrategy.type);
    
    for (const fallbackType of fallbackOrder) {
      try {
        console.log(`🔄 Attempting fallback: ${fallbackType}`);
        adaptations.push(`Fallback to ${fallbackType} after ${failedStrategy.type} failed`);
        
        const fallbackStrategy: ScrapingMethod = {
          type: fallbackType,
          confidence: 60,
          options: this.getMethodOptions(fallbackType, profile.characteristics)
        };

        let result: AdaptiveScrapingResult;
        
        switch (fallbackType) {
          case 'static':
            result = await this.scrapeWithStatic(url, fallbackStrategy, profile, adaptations);
            break;
          case 'dynamic':
            result = await this.scrapeWithDynamic(url, fallbackStrategy, profile, adaptations);
            break;
          case 'stealth':
            result = await this.scrapeWithStealth(url, fallbackStrategy, profile, adaptations, options);
            break;
          default:
            continue;
        }

        console.log(`✅ Fallback ${fallbackType} succeeded`);
        return result;
        
      } catch (fallbackError: any) {
        console.warn(`⚠️ Fallback ${fallbackType} also failed:`, fallbackError.message);
        this.updateProfileFailure(profile, fallbackType, fallbackError.message);
      }
    }

    // All strategies failed
    throw new Error(`All scraping strategies failed. Original: ${originalError.message}`);
  }

  private getFallbackOrder(failedType: string): ('static' | 'dynamic' | 'stealth')[] {
    switch (failedType) {
      case 'static':
        return ['dynamic', 'stealth'];
      case 'dynamic':
        return ['stealth', 'static'];
      case 'stealth':
        return ['dynamic', 'static'];
      default:
        return ['stealth', 'dynamic', 'static'];
    }
  }

  private analyzeContentQuality(content: ScrapedContent): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Word count scoring
    if (content.wordCount > 1000) {
      score += 30;
      reasons.push('Rich content');
    } else if (content.wordCount > 500) {
      score += 20;
      reasons.push('Moderate content');
    } else if (content.wordCount > 100) {
      score += 10;
      reasons.push('Basic content');
    } else {
      reasons.push('Minimal content');
    }

    // Title quality
    if (content.title && content.title.length > 10 && !content.title.includes('Error')) {
      score += 20;
      reasons.push('Good title');
    }

    // Meta description
    if (content.metadata?.metaDescription && content.metadata.metaDescription.length > 50) {
      score += 15;
      reasons.push('Has meta description');
    }

    // Links
    if (content.links && content.links.length > 5) {
      score += 15;
      reasons.push('Has navigation links');
    }

    // Content structure
    if (content.content.includes('\n') || content.content.length > content.wordCount * 4) {
      score += 20;
      reasons.push('Well-structured content');
    }

    return { score: Math.min(score, 100), reasons };
  }

  private updateProfileSuccess(profile: WebsiteProfile, method: 'static' | 'dynamic' | 'stealth'): void {
    const currentRate = profile.successRates[method];
    const attempts = profile.totalAttempts || 1;
    
    // Weighted average with more weight on recent results
    profile.successRates[method] = (currentRate * (attempts - 1) + 1) / attempts;
    
    // Update optimal strategy if this method is performing better
    if (profile.successRates[method] > profile.successRates[profile.optimalStrategy.type as keyof typeof profile.successRates]) {
      profile.optimalStrategy = {
        type: method,
        confidence: Math.round(profile.successRates[method] * 100),
        options: this.getMethodOptions(method, profile.characteristics)
      };
    }
  }

  private updateProfileFailure(profile: WebsiteProfile, method: 'static' | 'dynamic' | 'stealth', error: string): void {
    const currentRate = profile.successRates[method];
    const attempts = profile.totalAttempts || 1;
    
    // Weighted average
    profile.successRates[method] = (currentRate * (attempts - 1)) / attempts;
    
    // Track recent failures
    profile.recentFailures.push(`${method}: ${error}`);
    if (profile.recentFailures.length > 10) {
      profile.recentFailures = profile.recentFailures.slice(-10);
    }

    // Update characteristics based on error patterns
    if (error.toLowerCase().includes('blocked') || error.toLowerCase().includes('forbidden')) {
      profile.characteristics.hasAntiBot = true;
    }
    if (error.toLowerCase().includes('captcha')) {
      profile.characteristics.hasCaptcha = true;
    }
    if (error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('too many')) {
      profile.characteristics.hasRateLimit = true;
    }
    if (error.toLowerCase().includes('timeout') || error.toLowerCase().includes('javascript')) {
      profile.characteristics.requiresJS = true;
    }
  }

  // Analytics and management methods
  getProfileStats(domain?: string): WebsiteProfile[] | WebsiteProfile | null {
    if (domain) {
      return AdaptiveScraper.profiles.get(domain) || null;
    }
    return Array.from(AdaptiveScraper.profiles.values());
  }

  getSuccessRateStats(): { domain: string; rates: any; difficulty: string }[] {
    return Array.from(AdaptiveScraper.profiles.values()).map(profile => ({
      domain: profile.domain,
      rates: profile.successRates,
      difficulty: profile.characteristics.difficulty
    }));
  }

  clearProfile(domain: string): void {
    AdaptiveScraper.profiles.delete(domain);
  }

  exportProfiles(): string {
    const data = Array.from(AdaptiveScraper.profiles.entries()).map(([_, profile]) => profile);
    return JSON.stringify(data, null, 2);
  }

  importProfiles(data: string): void {
    try {
      const parsed = JSON.parse(data);
      const profiles = Array.isArray(parsed) ? parsed : [parsed];
      
      profiles.forEach((profile: any) => {
        if (profile && profile.domain) {
          AdaptiveScraper.profiles.set(profile.domain, {
            ...profile,
            lastUpdated: new Date(profile.lastUpdated)
          });
        }
      });
    } catch (error) {
      console.error('Failed to import profiles:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    await Promise.all([
      this.stealthScraper.cleanup(),
      this.dynamicScraper.close()
    ]);
    // Don't clear profiles on cleanup - they should persist
  }
} 