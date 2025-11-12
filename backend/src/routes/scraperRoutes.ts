import { Router } from 'express';
import { scrapeRateLimiter } from '../middleware/rateLimiter';
import { 
  checkRobotsController, 
  scrapeStaticController,
  scrapeIntelligentController,
  getAdaptiveStatsController,
  getSuccessRatesController,
  clearAdaptiveProfileController,
  exportAdaptiveProfilesController,
  importAdaptiveProfilesController
} from '../controllers/scraperController';

const router = Router();

// Check robots.txt for a URL
router.post('/check-robots', checkRobotsController);

// Intelligent scraping endpoint (new default)
router.post('/scrape', scrapeRateLimiter, scrapeIntelligentController);

// Static scraping endpoint (legacy/fallback)
router.post('/scrape-static', scrapeRateLimiter, scrapeStaticController);

// Adaptive scraping analytics and management
router.get('/adaptive/stats', getAdaptiveStatsController);
router.get('/adaptive/success-rates', getSuccessRatesController);
router.delete('/adaptive/profile/:domain', clearAdaptiveProfileController);
router.get('/adaptive/export', exportAdaptiveProfilesController);
router.post('/adaptive/import', importAdaptiveProfilesController);

export default router; 