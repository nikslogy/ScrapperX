import { Router } from 'express';
import { scrapeRateLimiter } from '../../middleware/rateLimiter';
import {
  checkRobotsController,
  scrapeIntelligentController,
  scrapeStaticController,
  getAdaptiveStatsController,
  getSuccessRatesController,
  clearAdaptiveProfileController,
  exportAdaptiveProfilesController,
  importAdaptiveProfilesController
} from './controllers';

const router = Router();

// Robots.txt checking
router.post('/check-robots', checkRobotsController);

// Intelligent scraping endpoint (main)
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
