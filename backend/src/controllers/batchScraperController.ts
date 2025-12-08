import { Request, Response } from 'express';
import Joi from 'joi';
import { IntelligentScraper } from '../utils/intelligentScraper';
import { ContentExtractorService } from '../services/contentExtractor';
import { validateUrls } from '../utils/urlValidator';
import { logSecurityEvent } from '../middleware/requestLogger';
import { withBrowserSlot, getConcurrencyStats } from '../utils/concurrencyLimiter';
import axios from 'axios';
import TurndownService from 'turndown';
import path from 'path';
import fs from 'fs/promises';

const env = process.env.NODE_ENV || 'development';
const BATCH_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CONCURRENCY_LIMIT = 3; // Process max 3 URLs at a time to avoid memory issues

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
    .max(env === 'production' ? 10 : 100)
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

// Helper function to scrape a single URL
async function scrapeUrl(url: string, options: any, scrapers: IntelligentScraper[]): Promise<any> {
  const intelligentScraper = new IntelligentScraper();
  scrapers.push(intelligentScraper);

  try {
    // Use concurrency limiter to control browser instances
    const scrapedData = await withBrowserSlot(async () => {
      return await intelligentScraper.scrape(url, options);
    });

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
}

// Helper to process URLs with limited concurrency
async function processWithConcurrency(
  urls: string[],
  options: any,
  scrapers: IntelligentScraper[],
  limit: number
): Promise<any[]> {
  const allResults: any[] = [];

  for (let i = 0; i < urls.length; i += limit) {
    const batch = urls.slice(i, i + limit);
    const batchNum = Math.floor(i / limit) + 1;
    const totalBatches = Math.ceil(urls.length / limit);
    console.log(`Processing batch ${batchNum}/${totalBatches}: ${batch.length} URLs`);

    // Add small delay between batches to let resources free up
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const batchResults = await Promise.allSettled(
      batch.map(url => scrapeUrl(url, options, scrapers))
    );

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        allResults.push({
          url: batch[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
  }

  return allResults;
}

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

    // SECURITY: Validate all URLs to prevent SSRF attacks
    const urlValidation = await validateUrls(urls);

    // Log any blocked URLs
    if (urlValidation.invalid.length > 0) {
      logSecurityEvent({
        type: 'invalid_url',
        ip: req.ip || 'unknown',
        details: `Blocked ${urlValidation.invalid.length} URLs in batch request: ${urlValidation.invalid.map(u => u.url).join(', ')}`,
        path: req.path
      });
    }

    // If ALL URLs are invalid, return error
    if (urlValidation.valid.length === 0) {
      res.status(400).json({
        success: false,
        error: 'All URLs Blocked',
        message: 'None of the provided URLs passed security validation',
        blocked: urlValidation.invalid
      });
      return;
    }

    const validUrls = urlValidation.valid;
    console.log(`🚀 Starting batch scraping for ${validUrls.length} URLs (${urlValidation.invalid.length} blocked)`);

    // Create timeout wrapper
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Batch operation timed out'));
      }, BATCH_TIMEOUT);
    });

    // Process URLs with concurrency limit
    const results = await Promise.race([
      processWithConcurrency(validUrls, options, scrapers, CONCURRENCY_LIMIT),
      timeoutPromise
    ]);

    // Separate successful and failed results
    const successfulResults = results.filter((r: any) => r.success);
    const failedResults = results.filter((r: any) => !r.success);

    // Generate response based on output format
    if (options.outputFormat === 'markdown') {
      // Create a combined markdown file
      let combinedMarkdown = '# Batch Scraping Results\n\n';
      combinedMarkdown += `**Generated:** ${new Date().toISOString()}\n\n`;
      combinedMarkdown += `**Total URLs Requested:** ${urls.length}\n`;
      combinedMarkdown += `**URLs Processed:** ${validUrls.length}\n`;
      combinedMarkdown += `**Successful:** ${successfulResults.length}\n`;
      combinedMarkdown += `**Failed:** ${failedResults.length}\n`;
      combinedMarkdown += `**Blocked (Security):** ${urlValidation.invalid.length}\n\n`;
      combinedMarkdown += '---\n\n';

      successfulResults.forEach((result: any, index: number) => {
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
        failedResults.forEach((result: any) => {
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
          totalUrlsRequested: urls.length,
          urlsProcessed: validUrls.length,
          successful: successfulResults.length,
          failed: failedResults.length,
          blocked: urlValidation.invalid.length,
          blockedUrls: urlValidation.invalid,
          outputFormat: 'markdown',
          downloadUrl: `/api/downloads/${fileName}`,
          fileName: fileName,
          results: successfulResults.map((r: any) => ({
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
