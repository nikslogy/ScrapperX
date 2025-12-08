import { Router, Request, Response } from 'express';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { isMongoDBConnected } from '../config/database';

const router = Router();

// Get version from package.json
let version = '1.1.0';
try {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../../package.json'), 'utf-8')
  );
  version = packageJson.version;
} catch (error) {
  console.error('Could not read version from package.json');
}

const isProduction = process.env.NODE_ENV === 'production';
const requiresApiKey = process.env.REQUIRE_API_KEY === 'true';

// Get exports directory size
const getExportsInfo = () => {
  const exportsDir = join(process.cwd(), 'exports');
  try {
    if (!existsSync(exportsDir)) return { files: 0, sizeBytes: 0 };

    const files = require('fs').readdirSync(exportsDir);
    let totalSize = 0;
    files.forEach((file: string) => {
      const filePath = join(exportsDir, file);
      const stat = statSync(filePath);
      totalSize += stat.size;
    });

    return {
      files: files.length,
      sizeBytes: totalSize,
      sizeHuman: formatBytes(totalSize)
    };
  } catch {
    return { files: 0, sizeBytes: 0, sizeHuman: '0 B' };
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

router.get('/', (req: Request, res: Response) => {
  const mongoConnected = isMongoDBConnected();
  const exportsInfo = getExportsInfo();

  // Check production mode at runtime (not at module load time)
  const isProd = process.env.NODE_ENV === 'production';

  res.status(200).json({
    success: true,
    message: 'ScrapperX API is healthy',
    version: version,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    uptimeHuman: formatUptime(process.uptime()),
    environment: process.env.NODE_ENV || 'development',

    // Security status
    security: {
      ssrfProtection: true,
      rateLimiting: true,
      hybridAuth: true,
      note: 'Anonymous users get limited access. Use API key for full access.'
    },

    // Service status
    services: {
      mongodb: mongoConnected ? 'connected' : 'not configured',
      crawler: mongoConnected ? 'available' : 'requires MongoDB'
    },

    // Storage info
    storage: {
      exports: exportsInfo,
      retentionDays: 7
    },

    // Rate limits (tiered: anonymous vs authenticated)
    limits: isProd ? {
      anonymous: {
        quickScrape: '3 req/hour',
        batchScrape: '1 req/hour',
        crawler: 'disabled (requires API key)'
      },
      withApiKey: {
        quickScrape: '20 req/min',
        batchScrape: '5 req/5min (10 URLs each)',
        crawler: mongoConnected ? '3 req/5min (200 pages max)' : 'disabled (requires MongoDB)'
      }
    } : {
      note: 'Development mode - limits are relaxed',
      quickScrape: '100 req/min',
      batchScrape: '50 req/5min',
      crawler: '20 req/5min'
    },

    // Available endpoints
    endpoints: {
      docs: '/docs',
      quickScrape: '/api/scraper/scrape',
      batchScrape: '/api/scraper/batch-scrape',
      crawler: mongoConnected ? '/api/crawler/start-domain-crawl' : null,
      downloads: '/api/downloads/:filename'
    }
  });
});

// Liveness probe for Kubernetes/Docker
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe
router.get('/ready', (req: Request, res: Response) => {
  // Check if essential services are ready
  const ready = true; // Add more checks if needed

  if (ready) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;