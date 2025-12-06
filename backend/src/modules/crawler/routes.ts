import { Router } from 'express';
import { crawlerRateLimiter } from '../../middleware/rateLimiter';
import {
  SessionController,
  ContentController,
  StructuredDataController,
  AuthenticationController,
  AnalyticsController
} from './controllers';

const router = Router();

// Instantiate controllers
const sessionController = new SessionController();
const contentController = new ContentController();
const structuredDataController = new StructuredDataController();
const authenticationController = new AuthenticationController();
const analyticsController = new AnalyticsController();

// Domain crawling routes
router.post('/start-domain-crawl', crawlerRateLimiter, sessionController.startDomainCrawl);
router.get('/sessions', sessionController.getAllSessions);
router.get('/session/:sessionId/status', sessionController.getCrawlStatus);
router.get('/session/:sessionId/progress', sessionController.getCrawlProgress);
router.post('/session/:sessionId/pause', sessionController.pauseCrawl);
router.post('/session/:sessionId/resume', sessionController.resumeCrawl);
router.post('/session/:sessionId/stop', sessionController.stopCrawl);
router.delete('/session/:sessionId', sessionController.deleteSession);

// Content routes
router.get('/session/:sessionId/content', contentController.getExtractedContent);
router.get('/session/:sessionId/content/:contentId', contentController.getContentItem);

// Structured data routes
router.get('/session/:sessionId/structured-data', structuredDataController.getStructuredData);
router.get('/session/:sessionId/structured-data/:schema', structuredDataController.getStructuredDataBySchema);

// Schema routes
router.get('/schemas', structuredDataController.getAvailableSchemas);

// Authentication routes
router.post('/test-authentication', authenticationController.testAuthentication);

// Analytics endpoint
router.get('/analytics', analyticsController.getAnalytics);

export default router;
