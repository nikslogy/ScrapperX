import { Router } from 'express';
import { CrawlerController } from '../controllers/crawlerController';

const router = Router();
const crawlerController = new CrawlerController();

// Domain crawling routes
router.post('/start-domain-crawl', crawlerController.startDomainCrawl);
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

// AI Analysis routes
router.get('/session/:sessionId/ai-analysis', crawlerController.getAIAnalysis);
router.get('/session/:sessionId/pattern-analysis', crawlerController.exportPatternAnalysis);

// Phase 3: Structured Data Extraction routes
router.get('/session/:sessionId/structured-data', crawlerController.getStructuredData);
router.get('/session/:sessionId/structured-data/:schema', crawlerController.getStructuredDataBySchema);

// Authentication routes
router.post('/test-authentication', crawlerController.testAuthentication);

// Schema routes
router.get('/schemas', crawlerController.getAvailableSchemas);

export default router; 