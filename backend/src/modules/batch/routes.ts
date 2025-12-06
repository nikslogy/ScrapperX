import { Router } from 'express';
import { batchScrapeRateLimiter } from '../../middleware/rateLimiter';
import { batchScrapeController } from './controllers';

const router = Router();

// Batch scraping endpoint (scrape multiple URLs at once)
router.post('/batch-scrape', batchScrapeRateLimiter, batchScrapeController);

export default router;
