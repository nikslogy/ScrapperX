import { Request, Response } from 'express';
import Joi from 'joi';
import { DomainCrawlerService } from '../services/domainCrawler';
import { RawContent } from '../models/crawlerModels';
import { ExportService } from '../services/exportService';
import { ExportOptions } from '../services/exporters/baseExporter';

export class CrawlerController {
  private crawlerService: DomainCrawlerService;
  private exportService: ExportService;

  constructor() {
    this.crawlerService = new DomainCrawlerService();
    this.exportService = new ExportService();
  }

  /**
   * Start domain crawl
   */
  startDomainCrawl = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const schema = Joi.object({
        url: Joi.string().uri().required(),
        config: Joi.object({
          maxPages: Joi.number().integer().min(1).max(10000).default(100),
          maxDepth: Joi.number().integer().min(1).max(10).default(5),
          respectRobots: Joi.boolean().default(true),
          delay: Joi.number().integer().min(0).max(10000).default(1000),
          concurrent: Joi.number().integer().min(1).max(10).default(3),
          includePatterns: Joi.array().items(Joi.string()).default([]),
          excludePatterns: Joi.array().items(Joi.string()).default([]),
          userAgent: Joi.string().optional(),
          timeout: Joi.number().integer().min(5000).max(120000).default(30000),
          enableAI: Joi.boolean().default(false),
          authentication: Joi.object({
            type: Joi.string().valid('none', 'basic', 'form', 'bearer', 'cookie').default('none'),
            credentials: Joi.object({
              username: Joi.string().optional(),
              password: Joi.string().optional(),
              token: Joi.string().optional(),
              cookies: Joi.object().optional(),
              loginUrl: Joi.string().uri().optional(),
              usernameField: Joi.string().default('username'),
              passwordField: Joi.string().default('password'),
              submitSelector: Joi.string().default('input[type="submit"], button[type="submit"]'),
              successIndicator: Joi.string().optional()
            }).optional()
          }).optional(),
          extraction: Joi.object({
            enableStructuredData: Joi.boolean().default(true),
            customSelectors: Joi.object().optional(),
            dataTypes: Joi.array().items(Joi.string()).optional(),
            qualityThreshold: Joi.number().min(0).max(1).default(0.7)
          }).optional()
        }).default({})
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.details.map(d => d.message)
        });
        return;
      }

      const { url, config } = value;

      // Start crawl
      const sessionId = await this.crawlerService.startDomainCrawl(url, config);

      res.status(201).json({
        success: true,
        message: 'Domain crawl started successfully',
        data: {
          sessionId,
          status: 'pending',
          startUrl: url,
          config
        }
      });

    } catch (error) {
      console.error('Error starting domain crawl:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start domain crawl',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get crawl session status
   */
  getCrawlStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
        return;
      }

      // Get session details
      const session = await this.crawlerService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }

      // Get progress
      const progress = await this.crawlerService.getCrawlProgress(sessionId);

      res.json({
        success: true,
        data: {
          session: {
            sessionId: session.sessionId,
            domain: session.domain,
            startUrl: session.startUrl,
            status: session.status,
            config: session.config,
            stats: session.stats,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          },
          progress
        }
      });

    } catch (error) {
      console.error('Error getting crawl status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get crawl status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get crawl progress (real-time)
   */
  getCrawlProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      const progress = await this.crawlerService.getCrawlProgress(sessionId);
      if (!progress) {
        res.status(404).json({
          success: false,
          message: 'Session not found or not active'
        });
        return;
      }

      res.json({
        success: true,
        data: progress
      });

    } catch (error) {
      console.error('Error getting crawl progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get crawl progress',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Pause crawl session
   */
  pauseCrawl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      await this.crawlerService.pauseCrawl(sessionId);

      res.json({
        success: true,
        message: 'Crawl session paused successfully'
      });

    } catch (error) {
      console.error('Error pausing crawl:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to pause crawl',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Resume crawl session
   */
  resumeCrawl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      await this.crawlerService.resumeCrawl(sessionId);

      res.json({
        success: true,
        message: 'Crawl session resumed successfully'
      });

    } catch (error) {
      console.error('Error resuming crawl:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resume crawl',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Stop crawl session
   */
  stopCrawl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      await this.crawlerService.stopCrawl(sessionId);

      res.json({
        success: true,
        message: 'Crawl session stopped successfully'
      });

    } catch (error) {
      console.error('Error stopping crawl:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop crawl',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get all crawl sessions
   */
  getAllSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessions = await this.crawlerService.getAllSessions();

      res.json({
        success: true,
        data: sessions.map(session => ({
          sessionId: session.sessionId,
          domain: session.domain,
          startUrl: session.startUrl,
          status: session.status,
          stats: session.stats,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        }))
      });

    } catch (error) {
      console.error('Error getting sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Delete crawl session
   */
  deleteSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      await this.crawlerService.deleteSession(sessionId);

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete session',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get extracted content for a session
   */
  getExtractedContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const query: any = { sessionId };
      if (status) {
        query.processingStatus = status;
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [content, total] = await Promise.all([
        RawContent.find(query)
          .select('-htmlContent') // Exclude large HTML content
          .skip(skip)
          .limit(Number(limit))
          .sort({ createdAt: -1 }),
        RawContent.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          content,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
            totalItems: total,
            itemsPerPage: Number(limit)
          }
        }
      });

    } catch (error) {
      console.error('Error getting extracted content:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get extracted content',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get specific content item
   */
  getContentItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, contentId } = req.params;

      const content = await RawContent.findOne({
        _id: contentId,
        sessionId
      });

      if (!content) {
        res.status(404).json({
          success: false,
          message: 'Content not found'
        });
        return;
      }

      res.json({
        success: true,
        data: content
      });

    } catch (error) {
      console.error('Error getting content item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get content item',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Enhanced export session data with multiple formats
   */
  exportSessionData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { 
        format = 'json',
        includeStructuredData = 'true',
        includeAIAnalysis = 'true', 
        includePatternAnalysis = 'false',
        minQualityScore = '0.5',
        compress = 'false',
        multiFormat = 'false'
      } = req.query;

      // Validate export options
      const options: ExportOptions = {
        format: format as 'json' | 'csv' | 'excel' | 'markdown' | 'xml',
        includeStructuredData: includeStructuredData === 'true',
        includeAIAnalysis: includeAIAnalysis === 'true',
        includePatternAnalysis: includePatternAnalysis === 'true',
        minQualityScore: parseFloat(minQualityScore as string),
        compress: compress === 'true'
      };

      // Validate format
      if (!['json', 'csv', 'excel', 'markdown'].includes(options.format)) {
        res.status(400).json({
          success: false,
          message: 'Unsupported export format. Supported formats: json, csv, excel, markdown'
        });
        return;
      }

      let result;

             if (multiFormat === 'true') {
                 // Export in multiple formats
        const formats: Array<'json' | 'csv' | 'excel' | 'markdown'> = ['json', 'csv', 'excel', 'markdown'];
        result = await this.exportService.exportMultipleFormats(sessionId, formats, options);
      } else {
        // Export in single format
        result = await this.exportService.exportSession(sessionId, options);
      }

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: 'Export failed',
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'Export completed successfully',
        data: {
          fileName: result.fileName,
          size: result.size,
          mimeType: result.mimeType,
          downloadUrl: result.downloadUrl,
          format: multiFormat === 'true' ? 'multi-format' : options.format
        }
      });

    } catch (error) {
      console.error('Error exporting session data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export session data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get AI analysis results for a session
   */
  getAIAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const analysis = await this.crawlerService.getAIAnalysis(sessionId);
      
      if (!analysis) {
        res.status(404).json({
          success: false,
          message: 'AI analysis not found or not completed'
        });
        return;
      }

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      console.error('Error getting AI analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI analysis',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Export pattern analysis
   */
  exportPatternAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      
      const patternData = await this.crawlerService.exportPatternAnalysis(sessionId);
      
      res.json({
        success: true,
        data: {
          sessionId,
          timestamp: new Date().toISOString(),
          patternAnalysis: patternData
        }
      });

    } catch (error) {
      console.error('Error exporting pattern analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export pattern analysis',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get structured data extraction results
   */
  getStructuredData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { minQuality = 0.5 } = req.query;

      // Get content with structured data
      const content = await RawContent.find({
        sessionId,
        'metadata.extractedData': { $exists: true },
        'metadata.extractedData.qualityScore': { $gte: Number(minQuality) }
      }).select('-htmlContent').sort({ 'metadata.extractedData.qualityScore': -1 });

      if (content.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No structured data found for this session'
        });
        return;
      }

      // Group by schema type
      const groupedData: { [key: string]: any[] } = {};
      let totalItems = 0;
      let averageQuality = 0;

      content.forEach(item => {
        const extractedData = item.metadata.extractedData;
        if (extractedData) {
          const schema = extractedData.schema;
          if (!groupedData[schema]) {
            groupedData[schema] = [];
          }
          
          groupedData[schema].push({
            url: item.url,
            schema: extractedData.schema,
            version: extractedData.version,
            fields: extractedData.fields,
            nestedStructures: extractedData.nestedStructures,
            qualityScore: extractedData.qualityScore,
            extractionMethod: extractedData.extractionMethod,
            extractedAt: extractedData.extractedAt
          });

          totalItems++;
          averageQuality += extractedData.qualityScore;
        }
      });

      averageQuality = totalItems > 0 ? averageQuality / totalItems : 0;

      res.json({
        success: true,
        data: {
          sessionId,
          totalItems,
          averageQuality: Math.round(averageQuality * 100) / 100,
          schemas: Object.keys(groupedData),
          extractedData: groupedData
        }
      });

    } catch (error) {
      console.error('Error getting structured data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get structured data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get structured data by schema type
   */
  getStructuredDataBySchema = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, schema } = req.params;
      const { minQuality = 0.5, limit = 100 } = req.query;

      const content = await RawContent.find({
        sessionId,
        'metadata.extractedData.schema': schema,
        'metadata.extractedData.qualityScore': { $gte: Number(minQuality) }
      }).select('url metadata.extractedData')
        .sort({ 'metadata.extractedData.qualityScore': -1 })
        .limit(Number(limit));

      if (content.length === 0) {
        res.status(404).json({
          success: false,
          message: `No ${schema} data found for this session`
        });
        return;
      }

      const structuredData = content.map(item => ({
        url: item.url,
        ...item.metadata.extractedData
      }));

      res.json({
        success: true,
        data: {
          sessionId,
          schema,
          count: structuredData.length,
          items: structuredData
        }
      });

    } catch (error) {
      console.error('Error getting structured data by schema:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get structured data by schema',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Test authentication configuration
   */
  testAuthentication = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const schema = Joi.object({
        url: Joi.string().uri().required(),
        authentication: Joi.object({
          type: Joi.string().valid('basic', 'form', 'bearer', 'cookie').required(),
          credentials: Joi.object({
            username: Joi.string().optional(),
            password: Joi.string().optional(),
            token: Joi.string().optional(),
            cookies: Joi.object().optional(),
            loginUrl: Joi.string().uri().optional(),
            usernameField: Joi.string().default('username'),
            passwordField: Joi.string().default('password'),
            submitSelector: Joi.string().default('input[type="submit"], button[type="submit"]'),
            successIndicator: Joi.string().optional()
          }).required()
        }).required()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.details.map(d => d.message)
        });
        return;
      }

      const { url, authentication } = value;

      // Test authentication using the enhanced authentication handler
      const authHandler = new (require('../services/authenticationHandler').AuthenticationHandler)();
      const testResult = await authHandler.testAuthentication(authentication, url);

      res.json({
        success: testResult.success,
        message: testResult.success ? 'Authentication test successful' : 'Authentication test failed',
        data: {
          url,
          authenticationType: authentication.type,
          testResult: testResult.success ? 'Authentication successful' : testResult.error,
          sessionData: testResult.sessionData,
          error: testResult.error
        }
      });

    } catch (error) {
      console.error('Error testing authentication:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to test authentication',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get available extraction schemas
   */
  getAvailableSchemas = async (req: Request, res: Response): Promise<void> => {
    try {
      // This would come from the StructuredExtractor service
      const schemas = [
        'product', 'article', 'contact', 'event', 'job', 'generic'
      ];

      res.json({
        success: true,
        data: {
          schemas,
          count: schemas.length
        }
      });

    } catch (error) {
      console.error('Error getting available schemas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available schemas',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get export history
   */
  getExportHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const history = await this.exportService.getExportHistory();

      res.json({
        success: true,
        data: {
          exports: history,
          count: history.length
        }
      });

    } catch (error) {
      console.error('Error getting export history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get export history',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Clean up old export files
   */
  cleanupExports = async (req: Request, res: Response): Promise<void> => {
    try {
      const { olderThanDays = '7' } = req.query;
      const days = parseInt(olderThanDays as string);

      if (isNaN(days) || days < 1) {
        res.status(400).json({
          success: false,
          message: 'Invalid olderThanDays parameter. Must be a positive integer.'
        });
        return;
      }

      const deletedCount = await this.exportService.cleanupOldExports(days);

      res.json({
        success: true,
        message: `Cleanup completed successfully`,
        data: {
          deletedFiles: deletedCount,
          olderThanDays: days
        }
      });

    } catch (error) {
      console.error('Error cleaning up exports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup exports',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Download exported file
   */
  downloadExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileName } = req.params;
      
      if (!fileName) {
        res.status(400).json({
          success: false,
          message: 'File name is required'
        });
        return;
      }

      const filePath = require('path').join(process.cwd(), 'exports', fileName);
      
      // Check if file exists
      try {
        await require('fs/promises').access(filePath);
      } catch {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
        return;
      }

      // Set appropriate headers
      const mimeTypes: { [key: string]: string } = {
        '.json': 'application/json',
        '.csv': 'text/csv',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.md': 'text/markdown',
        '.zip': 'application/zip'
      };

      const ext = require('path').extname(fileName);
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);

    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download export',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
} 