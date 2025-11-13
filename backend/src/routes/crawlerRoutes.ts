import { Router } from 'express';
import { CrawlerController } from '../controllers/crawlerController';
import { crawlerRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const crawlerController = new CrawlerController();

// Domain crawling routes
router.post('/start-domain-crawl', crawlerRateLimiter, crawlerController.startDomainCrawl);
router.get('/sessions', crawlerController.getAllSessions);
router.get('/session/:sessionId/status', crawlerController.getCrawlStatus);
router.get('/session/:sessionId/progress', crawlerController.getCrawlProgress);
router.post('/session/:sessionId/pause', crawlerController.pauseCrawl);
router.post('/session/:sessionId/resume', crawlerController.resumeCrawl);
router.post('/session/:sessionId/stop', crawlerController.stopCrawl);
router.delete('/session/:sessionId', crawlerController.deleteSession);

// Content routes
router.get('/session/:sessionId/content', crawlerController.getExtractedContent);
router.get('/session/:sessionId/content/:contentId', crawlerController.getContentItem);

// Enhanced Export routes
router.get('/session/:sessionId/export', crawlerController.exportSessionData);
router.get('/exports/history', crawlerController.getExportHistory);
router.delete('/exports/cleanup', crawlerController.cleanupExports);


// Phase 3: Structured Data Extraction routes
router.get('/session/:sessionId/structured-data', crawlerController.getStructuredData);
router.get('/session/:sessionId/structured-data/:schema', crawlerController.getStructuredDataBySchema);

// Authentication routes
router.post('/test-authentication', crawlerController.testAuthentication);

// Schema routes
router.get('/schemas', crawlerController.getAvailableSchemas);

// Analytics endpoint
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const days = parseInt(timeRange.toString().replace('d', ''));
    
    // For now, return mock analytics data
    // In a real implementation, you'd query the database
    const mockAnalytics = {
      overview: {
        totalSessions: Math.floor(Math.random() * 200) + 100,
        totalPages: Math.floor(Math.random() * 5000) + 2000,
        totalItems: Math.floor(Math.random() * 10000) + 5000,
        avgQuality: Math.random() * 0.3 + 0.7,
        activeToday: Math.floor(Math.random() * 20) + 5,
        successRate: Math.random() * 10 + 90
      },
      trends: Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return {
          date: date.toISOString().split('T')[0],
          sessions: Math.floor(Math.random() * 20) + 5,
          pages: Math.floor(Math.random() * 500) + 100,
          items: Math.floor(Math.random() * 200) + 50,
          quality: Math.random() * 0.3 + 0.7
        };
      }),
      domains: [
        { domain: 'news.ycombinator.com', sessions: 23, pages: 450, items: 892, successRate: 98.5 },
        { domain: 'reddit.com', sessions: 18, pages: 320, items: 567, successRate: 92.1 },
        { domain: 'github.com', sessions: 15, pages: 280, items: 445, successRate: 96.8 },
        { domain: 'stackoverflow.com', sessions: 12, pages: 240, items: 398, successRate: 91.3 },
        { domain: 'medium.com', sessions: 9, pages: 180, items: 287, successRate: 89.7 }
      ],
      dataTypes: [
        { type: 'article', count: 3420, percentage: 38.2 },
        { type: 'product', count: 2156, percentage: 24.1 },
        { type: 'contact', count: 1789, percentage: 20.0 },
        { type: 'event', count: 892, percentage: 10.0 },
        { type: 'job', count: 456, percentage: 5.1 },
        { type: 'generic', count: 229, percentage: 2.6 }
      ],
      performance: {
        avgResponseTime: Math.random() * 2 + 1,
        errors: Math.floor(Math.random() * 50) + 10,
        retries: Math.floor(Math.random() * 100) + 20,
        bandwidth: Math.random() * 200 + 50
      }
    };

    res.json({
      success: true,
      data: mockAnalytics,
      message: 'Analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 