import { Request, Response } from 'express';
import Joi from 'joi';
import { IntelligentScraper } from '../utils/intelligentScraper';
import { ContentExtractorService } from '../services/contentExtractor';
import axios from 'axios';
import TurndownService from 'turndown';
import path from 'path';
import fs from 'fs/promises';

const env = process.env.NODE_ENV || 'development';
const BATCH_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-'
});

// Validation schema for batch scraping
const batchScrapeSchema = Joi.object({
  urls: Joi.array()
    .items(Joi.string().uri())
    .min(1)
    .max(env === 'production' ? 10 : 100) // Limit to 10 URLs in production
    .required()
    .messages({
      'array.min': 'At least 1 URL is required',
      'array.max': env === 'production'
        ? 'Maximum 10 URLs allowed per batch request'
        : 'Maximum 100 URLs allowed per batch request',
      'any.required': 'URLs array is required'
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
    learningMode: Joi.boolean().optional().default(true),
    outputFormat: Joi.string().valid('json', 'markdown').optional().default('markdown')
  }).optional()
});

/**
 * Batch scrape multiple URLs and return markdown files
 */
export const batchScrapeController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const scrapers: IntelligentScraper[] = [];
  
  try {
    // Validate input
    const { error, value } = batchScrapeSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.details[0]?.message || 'Validation failed'
      });
      return;
    }

    const { urls, options = {} } = value;

    console.log(`🚀 Starting batch scraping for ${urls.length} URLs`);

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Batch operation timed out'));
      }, BATCH_TIMEOUT);
    });

    // Race the main processing against the timeout
    await Promise.race([
      // Main processing logic
      (async () => {

    // Process all URLs concurrently with Promise.allSettled
    const results = await Promise.allSettled(
      urls.map(async (url: string) => {
        const intelligentScraper = new IntelligentScraper();
        scrapers.push(intelligentScraper);
        
        try {
          // Perform intelligent scraping
          const scrapedData = await intelligentScraper.scrape(url, options);

          // Extract clean markdown content
          let markdownContent: string | undefined;
          try {
            const htmlResponse = await axios.get(url, {
              headers: {
                'User-Agent': options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              },
              timeout: 15000
            });
            
            const contentExtractor = new ContentExtractorService();
            const extractedContent = await contentExtractor.extractContent(
              htmlResponse.data, 
              url, 
              new URL(url).hostname
            );
            markdownContent = extractedContent.markdownContent;
          } catch (markdownError) {
            console.error(`Failed to extract markdown for ${url}:`, markdownError);
            // Fallback to basic markdown conversion
            if (scrapedData.content) {
              markdownContent = turndownService.turndown(scrapedData.content);
            }
          }

          return {
            url,
            success: true,
            data: {
              title: scrapedData.title,
              description: scrapedData.description,
              markdown: markdownContent || scrapedData.content,
              wordCount: scrapedData.wordCount,
              method: scrapedData.method,
              qualityScore: scrapedData.qualityScore,
              scrapedAt: scrapedData.scrapedAt
            }
          };
        } catch (error: any) {
          console.error(`Failed to scrape ${url}:`, error);
          return {
            url,
            success: false,
            error: error.message || 'Scraping failed'
          };
        }
      })
    );

    // Process results
    const successfulResults: any[] = [];
    const failedResults: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successfulResults.push(result.value);
        } else {
          failedResults.push(result.value);
        }
      } else {
        failedResults.push({
          url: urls[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // Generate response based on output format
    if (options.outputFormat === 'markdown') {
      // Create a combined markdown file
      let combinedMarkdown = '# Batch Scraping Results\n\n';
      combinedMarkdown += `**Generated:** ${new Date().toISOString()}\n\n`;
      combinedMarkdown += `**Total URLs:** ${urls.length}\n`;
      combinedMarkdown += `**Successful:** ${successfulResults.length}\n`;
      combinedMarkdown += `**Failed:** ${failedResults.length}\n\n`;
      combinedMarkdown += '---\n\n';

      successfulResults.forEach((result, index) => {
        combinedMarkdown += `## ${index + 1}. ${result.data.title || 'Untitled'}\n\n`;
        combinedMarkdown += `**URL:** ${result.url}\n\n`;
        combinedMarkdown += `**Quality Score:** ${result.data.qualityScore}%\n\n`;
        combinedMarkdown += `**Method:** ${result.data.method}\n\n`;
        combinedMarkdown += `**Word Count:** ${result.data.wordCount}\n\n`;
        if (result.data.description) {
          combinedMarkdown += `**Description:** ${result.data.description}\n\n`;
        }
        combinedMarkdown += '### Content\n\n';
        combinedMarkdown += result.data.markdown || '';
        combinedMarkdown += '\n\n---\n\n';
      });

      if (failedResults.length > 0) {
        combinedMarkdown += '## Failed URLs\n\n';
        failedResults.forEach((result) => {
          combinedMarkdown += `- **${result.url}**: ${result.error}\n`;
        });
      }

      // Save to file and return download link
      const fileName = `batch-scrape-${Date.now()}.md`;
      const exportsDir = path.join(process.cwd(), 'exports');
      const filePath = path.join(exportsDir, fileName);
      
      await fs.mkdir(exportsDir, { recursive: true });
      await fs.writeFile(filePath, combinedMarkdown, 'utf-8');

      res.status(200).json({
        success: true,
        message: 'Batch scraping completed',
        data: {
          totalUrls: urls.length,
          successful: successfulResults.length,
          failed: failedResults.length,
          outputFormat: 'markdown',
          downloadUrl: `/api/downloads/${fileName}`,
          fileName: fileName,
          results: successfulResults.map(r => ({
            url: r.url,
            title: r.data.title,
            qualityScore: r.data.qualityScore,
            wordCount: r.data.wordCount
          })),
          errors: failedResults
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Return JSON format
      res.status(200).json({
        success: true,
        message: 'Batch scraping completed',
        data: {
          totalUrls: urls.length,
          successful: successfulResults.length,
          failed: failedResults.length,
          outputFormat: 'json',
          results: successfulResults,
          errors: failedResults
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`✅ Batch scraping completed: ${successfulResults.length}/${urls.length} successful`);

      })(), // Close the main processing async function
      timeoutPromise
    ]); // Close Promise.race

  } catch (error: any) {
    console.error('❌ Batch scraping failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch Scraping Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    // Cleanup all scrapers
    await Promise.all(scrapers.map(scraper => scraper.cleanup()));
  }
};

