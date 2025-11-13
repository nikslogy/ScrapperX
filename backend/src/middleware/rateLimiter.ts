import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  points: isProduction ? 100 : 1000, // General API calls per window
  duration: 60, // Per 60 seconds (1 minute)
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Stricter rate limiter for single scraping endpoints
const scrapeLimiter = new RateLimiterMemory({
  points: isProduction ? 20 : 100, // Single scrape requests per window
  duration: 60, // Per 1 minute
  blockDuration: 120, // Block for 2 minutes
});

// Even stricter rate limiter for batch scraping
const batchScrapeLimiter = new RateLimiterMemory({
  points: isProduction ? 5 : 50, // Batch scrape requests per window (each can have up to 10 URLs)
  duration: 300, // Per 5 minutes
  blockDuration: 300, // Block for 5 minutes
});

// Rate limiter for crawler endpoints (most resource intensive)
const crawlerLimiter = new RateLimiterMemory({
  points: isProduction ? 3 : 20, // Crawler requests per window
  duration: 300, // Per 5 minutes
  blockDuration: 600, // Block for 10 minutes
});

export const generalRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${secs} seconds.`,
      retryAfter: secs,
      limit: isProduction ? '100 requests per minute' : '1000 requests per minute'
    });
  }
};

export const scrapeRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await scrapeLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Scraping Rate Limit Exceeded',
      message: `Too many scraping requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      limit: isProduction ? '20 requests per minute' : '100 requests per minute'
    });
  }
};

export const batchScrapeRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await batchScrapeLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Batch Scraping Rate Limit Exceeded',
      message: `Too many batch scraping requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      limit: isProduction ? '5 requests per 5 minutes (max 10 URLs each)' : '50 requests per 5 minutes'
    });
  }
};

export const crawlerRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await crawlerLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Crawler Rate Limit Exceeded',
      message: `Too many crawler requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      limit: isProduction ? '3 requests per 5 minutes (max 200 pages each)' : '20 requests per 5 minutes'
    });
  }
};

// Export the general rate limiter as default
export { generalRateLimiter as rateLimiter }; 