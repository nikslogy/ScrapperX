import { Router } from 'express';
import { scrapeRateLimiter } from '../middleware/rateLimiter';
import { 
  checkRobotsController, 
  scrapeStaticController 
} from '../controllers/scraperController';

const router = Router();

// Check robots.txt for a URL
router.post('/check-robots', checkRobotsController);

// Static scraping endpoint
router.post('/scrape', scrapeRateLimiter, scrapeStaticController);

export default router; 