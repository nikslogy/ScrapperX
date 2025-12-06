import { Request, Response } from 'express';
import { startCrawlSchema } from '../validators';
import { DomainCrawlerService } from '../services/domainCrawler';
import { isMongoDBConnected } from '../../../config/database';

/**
 * Controller for crawl session management
 */
export class SessionController {
  private crawlerService: DomainCrawlerService;

  constructor() {
    this.crawlerService = new DomainCrawlerService();
  }

  /**
   * Start domain crawl
   */
  startDomainCrawl = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isMongoDBConnected()) {
        res.status(503).json({
          success: false,
          message: 'Domain crawler requires MongoDB. Please configure MONGODB_URI in your environment variables.',
          error: 'MongoDB connection not available'
        });
        return;
      }

      const { error, value } = startCrawlSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.details.map(d => d.message)
        });
        return;
      }

      const { url, config } = value;

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

      const session = await this.crawlerService.getSession(sessionId);
      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }

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
}
