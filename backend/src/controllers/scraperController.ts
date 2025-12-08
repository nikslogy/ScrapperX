import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import axios from 'axios';
import { StaticScraper } from '../utils/staticScraper';
import { RobotsChecker } from '../utils/robotsChecker';
import { IntelligentScraper } from '../utils/intelligentScraper';
import { ContentExtractorService } from '../services/contentExtractor';
import { validateUrl } from '../utils/urlValidator';
import { logSecurityEvent } from '../middleware/requestLogger';
import { withBrowserSlot, getConcurrencyStats } from '../utils/concurrencyLimiter';

// Validation schemas
const urlSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid URL',
    'any.required': 'URL is required'
  }),
  userAgent: Joi.string().optional().default('ScrapperX-Bot')
});

const scrapeSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid URL',
    'any.required': 'URL is required'
  }),
  options: Joi.object({
    userAgent: Joi.string().optional(),
    timeout: Joi.number().min(1000).max(120000).optional(),
    maxRetries: Joi.number().min(1).max(5).optional().default(3),
    forceMethod: Joi.string().valid('static', 'dynamic', 'stealth', 'adaptive', 'api').optional(),
    enableApiScraping: Joi.boolean().optional().default(true),
    enableDynamicScraping: Joi.boolean().optional().default(true),
    enableStealthScraping: Joi.boolean().optional().default(true),
    enableAdaptiveScraping: Joi.boolean().optional().default(true),
    respectRobots: Joi.boolean().optional().default(false),
    qualityThreshold: Joi.number().min(0).max(100).optional().default(70),
    captchaSolver: Joi.string().valid('manual', '2captcha', 'anticaptcha', 'skip').optional().default('skip'),
    captchaApiKey: Joi.string().optional().allow(''),
    stealthLevel: Joi.string().valid('basic', 'advanced', 'maximum').optional().default('advanced'),
    learningMode: Joi.boolean().optional().default(true)
  }).optional()
});

export const checkRobotsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate input
    const { error, value } = urlSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details[0]?.message || 'Validation failed'
      });
      return;
    }

    const { url, userAgent } = value;

    // Check robots.txt
    const robotsInfo = await RobotsChecker.checkRobots(url, userAgent);
    const complianceReport = RobotsChecker.generateComplianceReport(robotsInfo);

    res.status(200).json({
      success: true,
      data: {
        robotsInfo,
        complianceReport
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error checking robots.txt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check robots.txt',
      message: error.message
    });
  }
};

// New controller for adaptive scraping analytics
export const getAdaptiveStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();

  try {
    const { domain } = req.query;
    const stats = intelligentScraper.getAdaptiveStats(domain as string);

    res.status(200).json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting adaptive stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get adaptive stats',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

export const getSuccessRatesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();

  try {
    const successRates = intelligentScraper.getSuccessRates();

    res.status(200).json({
      success: true,
      data: {
        totalDomains: successRates.length,
        successRates: successRates,
        summary: {
          averageStaticSuccess: successRates.reduce((acc, curr) => acc + curr.rates.static, 0) / successRates.length || 0,
          averageDynamicSuccess: successRates.reduce((acc, curr) => acc + curr.rates.dynamic, 0) / successRates.length || 0,
          averageStealthSuccess: successRates.reduce((acc, curr) => acc + curr.rates.stealth, 0) / successRates.length || 0,
          difficultyDistribution: {
            easy: successRates.filter(s => s.difficulty === 'easy').length,
            medium: successRates.filter(s => s.difficulty === 'medium').length,
            hard: successRates.filter(s => s.difficulty === 'hard').length,
            extreme: successRates.filter(s => s.difficulty === 'extreme').length
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting success rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get success rates',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

export const clearAdaptiveProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();

  try {
    const { domain } = req.params;

    if (!domain) {
      res.status(400).json({
        success: false,
        error: 'Domain parameter is required'
      });
      return;
    }

    intelligentScraper.clearAdaptiveProfile(domain);

    res.status(200).json({
      success: true,
      message: `Adaptive profile cleared for domain: ${domain}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error clearing adaptive profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear adaptive profile',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

export const exportAdaptiveProfilesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();

  try {
    const profiles = intelligentScraper.exportAdaptiveProfiles();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="adaptive-profiles.json"');
    res.status(200).send(profiles);
  } catch (error: any) {
    console.error('Error exporting adaptive profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export adaptive profiles',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

export const importAdaptiveProfilesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();

  try {
    const { profiles } = req.body;

    if (!profiles || typeof profiles !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Profiles data is required as JSON string'
      });
      return;
    }

    intelligentScraper.importAdaptiveProfiles(profiles);

    res.status(200).json({
      success: true,
      message: 'Adaptive profiles imported successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error importing adaptive profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import adaptive profiles',
      message: error.message
    });
  } finally {
    await intelligentScraper.cleanup();
  }
};

export const scrapeIntelligentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();

  try {
    // Validate input
    const { error, value } = scrapeSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details[0]?.message || 'Validation failed'
      });
      return;
    }

    const { url, options = {} } = value;

    // SECURITY: Validate URL to prevent SSRF attacks
    const urlValidation = await validateUrl(url);
    if (!urlValidation.valid) {
      logSecurityEvent({
        type: 'invalid_url',
        ip: req.ip || 'unknown',
        details: `Blocked URL: ${url} - ${urlValidation.reason}`,
        path: req.path
      });
      res.status(400).json({
        success: false,
        error: 'URL Not Allowed',
        message: urlValidation.reason
      });
      return;
    }

    const sanitizedUrl = urlValidation.sanitizedUrl || url;
    console.log(`🚀 Starting intelligent scraping for: ${sanitizedUrl}`);
    console.log(`⚙️ Options:`, options);
    console.log(`📊 Concurrency: ${JSON.stringify(getConcurrencyStats())}`);

    // Wrap in concurrency limiter to prevent too many browsers running
    const scrapedData = await withBrowserSlot(async () => {
      return await intelligentScraper.scrape(sanitizedUrl, options);
    });

    // Extract clean markdown content (Firecrawl-style)
    let markdownContent: string | undefined;
    try {
      const htmlResponse = await axios.get(url, {
        headers: {
          'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000
      });

      const contentExtractor = new ContentExtractorService();
      const extractedContent = await contentExtractor.extractContent(htmlResponse.data, url, new URL(url).hostname);
      markdownContent = extractedContent.markdownContent;

      if (!markdownContent || markdownContent.length === 0) {
        markdownContent = undefined;
      }
    } catch (markdownError) {
      console.error('Failed to extract markdown content:', markdownError);
      markdownContent = undefined;
    }

    // Prepare response with comprehensive data
    const response = {
      success: true,
      data: {
        // Core scraped content
        url: scrapedData.url,
        title: scrapedData.title,
        description: scrapedData.description,
        content: scrapedData.content,
        markdownContent, // Clean Firecrawl-style markdown
        links: scrapedData.links,
        images: scrapedData.images,
        headings: scrapedData.headings,
        metadata: scrapedData.metadata,
        wordCount: scrapedData.wordCount,
        scrapedAt: scrapedData.scrapedAt,
        method: scrapedData.method,

        // Enhanced intelligent scraping data
        strategy: scrapedData.strategy,
        qualityScore: scrapedData.qualityScore,
        completenessScore: scrapedData.completenessScore,
        performanceMetrics: scrapedData.performanceMetrics,

        // Robots compliance (logged but not enforced)
        robotsCompliance: {
          isAllowed: scrapedData.robotsInfo.isAllowed,
          crawlDelay: scrapedData.robotsInfo.crawlDelay,
          robotsUrl: scrapedData.robotsInfo.robotsUrl,
          policy: scrapedData.robotsInfo.isAllowed ? 'ALLOWED' : 'BLOCKED',
          enforced: options.respectRobots || false
        },

        // Additional content if available
        ...(scrapedData.additionalContent && {
          additionalContent: scrapedData.additionalContent
        }),

        // API data if available
        ...(scrapedData.apiData && {
          apiData: {
            endpointsFound: scrapedData.apiData.endpoints.length,
            dataPointsExtracted: scrapedData.apiData.totalDataPoints,
            structuredContent: scrapedData.apiData.structuredContent
          }
        })
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Intelligent scraping completed successfully`);
    console.log(`📊 Strategy: ${scrapedData.strategy.method}, Quality: ${scrapedData.qualityScore}%`);

    res.status(200).json(response);

  } catch (error: any) {
    console.error('❌ Intelligent scraping failed:', error);
    res.status(500).json({
      success: false,
      error: 'Intelligent Scraping Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Cleanup resources
    await intelligentScraper.cleanup();
  }
};

// Keep the original static controller for backward compatibility
export const scrapeStaticController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate input
    const { error, value } = scrapeSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details[0]?.message || 'Validation failed'
      });
      return;
    }

    const { url, options = {} } = value;

    // Check robots.txt first (enforce if respectRobots is true)
    const robotsInfo = await RobotsChecker.checkRobots(url);

    if (!robotsInfo.isAllowed && options.respectRobots) {
      res.status(403).json({
        success: false,
        error: 'Scraping Not Allowed',
        message: 'robots.txt disallows scraping this URL',
        robotsInfo: {
          isAllowed: robotsInfo.isAllowed,
          error: robotsInfo.error,
          robotsUrl: robotsInfo.robotsUrl
        }
      });
      return;
    }

    // Perform static scraping
    const scraper = new StaticScraper();
    const scrapedData = await scraper.scrape(url, {
      userAgent: options.userAgent,
      timeout: options.timeout
    });

    // Add robots info to response
    const response = {
      success: true,
      data: {
        ...scrapedData,
        robotsCompliance: {
          isAllowed: robotsInfo.isAllowed,
          crawlDelay: robotsInfo.crawlDelay,
          robotsUrl: robotsInfo.robotsUrl
        }
      },
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('Error scraping website:', error);
    res.status(500).json({
      success: false,
      error: 'Scraping Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}; 