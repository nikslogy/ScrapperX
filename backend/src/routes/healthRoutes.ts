import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

// Get version from package.json
let version = '1.0.0';
try {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../../package.json'), 'utf-8')
  );
  version = packageJson.version;
} catch (error) {
  console.error('Could not read version from package.json');
}

const isProduction = process.env.NODE_ENV === 'production';

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'ScrapperX API is healthy',
    version: version,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    limits: {
      quickScrape: isProduction ? '20 req/min' : '100 req/min',
      batchScrape: isProduction ? '5 req/5min (10 URLs max)' : '50 req/5min',
      crawler: isProduction ? '3 req/5min (200 pages max)' : '20 req/5min'
    },
    endpoints: {
      docs: '/docs',
      quickScrape: '/api/scraper/scrape',
      batchScrape: '/api/scraper/batch-scrape',
      crawler: '/api/crawler/start-domain-crawl'
    }
  });
});

export default router; 