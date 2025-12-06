import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { scrapeSchema } from '../validators';
import { StaticScraper } from '../services/staticScraper';
import { RobotsChecker } from '../services/robotsChecker';
import { IntelligentScraper } from '../services/intelligentScraper';
import { ContentExtractorService } from '../../crawler/services/contentExtractor';

/**
 * Intelligent scraping controller - main scraping endpoint
 */
export const scrapeIntelligentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const intelligentScraper = new IntelligentScraper();
  
  try {
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

    console.log(`🚀 Starting intelligent scraping for: ${url}`);
    console.log(`⚙️ Options:`, options);

    const scrapedData = await intelligentScraper.scrape(url, options);

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

    const response = {
      success: true,
      data: {
        url: scrapedData.url,
        title: scrapedData.title,
        description: scrapedData.description,
        content: scrapedData.content,
        markdownContent,
        links: scrapedData.links,
        images: scrapedData.images,
        headings: scrapedData.headings,
        metadata: scrapedData.metadata,
        wordCount: scrapedData.wordCount,
        scrapedAt: scrapedData.scrapedAt,
        method: scrapedData.method,
        strategy: scrapedData.strategy,
        qualityScore: scrapedData.qualityScore,
        completenessScore: scrapedData.completenessScore,
        performanceMetrics: scrapedData.performanceMetrics,
        robotsCompliance: {
          isAllowed: scrapedData.robotsInfo.isAllowed,
          crawlDelay: scrapedData.robotsInfo.crawlDelay,
          robotsUrl: scrapedData.robotsInfo.robotsUrl,
          policy: scrapedData.robotsInfo.isAllowed ? 'ALLOWED' : 'BLOCKED',
          enforced: options.respectRobots || false
        },
        ...(scrapedData.additionalContent && {
          additionalContent: scrapedData.additionalContent
        }),
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
    await intelligentScraper.cleanup();
  }
};

/**
 * Static scraping controller - legacy/fallback endpoint
 */
export const scrapeStaticController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    const scraper = new StaticScraper();
    const scrapedData = await scraper.scrape(url, {
      userAgent: options.userAgent,
      timeout: options.timeout
    });

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
