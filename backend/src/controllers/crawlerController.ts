import { Request, Response } from 'express';
import Joi from 'joi';
import { DomainCrawlerService } from '../services/domainCrawler';
import { RawContent } from '../models/crawlerModels';

export class CrawlerController {
  private crawlerService: DomainCrawlerService;

  constructor() {
    this.crawlerService = new DomainCrawlerService();
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
          timeout: Joi.number().integer().min(5000).max(120000).default(30000)
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
   * Export session data
   */
  exportSessionData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { format = 'json' } = req.query;

      // Get session
      const session = await this.crawlerService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }

      // Get all content
      const content = await RawContent.find({ sessionId })
        .select('-htmlContent')
        .sort({ createdAt: 1 });

      const exportData = {
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
        content: content.map(item => ({
          url: item.url,
          title: item.metadata.title,
          description: item.metadata.description,
          processingStatus: item.processingStatus,
          metadata: {
            title: item.metadata.title,
            description: item.metadata.description,
            aiContentType: item.metadata.aiContentType,
            confidence: item.metadata.confidence,
            relevanceScore: item.metadata.relevanceScore,
            structuredData: item.metadata.structuredData,
            aiAnalysis: item.metadata.aiAnalysis
          },
          contentChunks: item.contentChunks,
          extractedLinks: item.extractedLinks,
          createdAt: item.createdAt
        }))
      };

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="crawl-${sessionId}.json"`);
        res.json(exportData);
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported export format. Currently only JSON is supported.'
        });
      }

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
} 