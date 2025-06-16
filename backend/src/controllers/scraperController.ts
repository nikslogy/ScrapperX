import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { StaticScraper } from '../utils/staticScraper';
import { RobotsChecker } from '../utils/robotsChecker';

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
    timeout: Joi.number().min(1000).max(30000).optional(),
    followRedirects: Joi.boolean().optional(),
    maxRedirects: Joi.number().min(0).max(10).optional()
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

    // Optional: Check robots.txt first
    const robotsInfo = await RobotsChecker.checkRobots(url);
    
    if (!robotsInfo.isAllowed) {
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
    const scrapedData = await scraper.scrape(url, options);

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