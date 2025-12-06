import { Request, Response } from 'express';
import axios from 'axios';
import TurndownService from 'turndown';
import path from 'path';
import fs from 'fs/promises';
import { batchScrapeSchema } from '../validators';
import { IntelligentScraper } from '../../scraper/services/intelligentScraper';
import { ContentExtractorService } from '../../crawler/services/contentExtractor';

const BATCH_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  bulletListMarker: '-'
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

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Batch operation timed out'));
      }, BATCH_TIMEOUT);
    });

    await Promise.race([
      (async () => {
        const results = await Promise.allSettled(
          urls.map(async (url: string) => {
            const intelligentScraper = new IntelligentScraper();
            scrapers.push(intelligentScraper);
            
            try {
              const scrapedData = await intelligentScraper.scrape(url, options);

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
          })
        );

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

        if (options.outputFormat === 'markdown') {
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
      })(),
      timeoutPromise
    ]);

  } catch (error: any) {
    console.error('❌ Batch scraping failed:', error);
    res.status(500).json({
      success: false,
      error: 'Batch Scraping Failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await Promise.all(scrapers.map(scraper => scraper.cleanup()));
  }
};
