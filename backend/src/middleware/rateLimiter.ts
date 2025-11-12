import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  points: process.env.NODE_ENV === 'production' ? 100 : 200, // Increased for polling
  duration: 60, // Per 60 seconds (1 minute)
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Stricter rate limiter for scraping endpoints
const scrapeLimiter = new RateLimiterMemory({
  points: process.env.NODE_ENV === 'production' ? 5 : 20, // Fewer requests for scraping
  duration: 300, // Per 5 minutes
  blockDuration: 300, // Block for 5 minutes
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
      retryAfter: secs
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
      retryAfter: secs
    });
  }
};

// Export the general rate limiter as default
export { generalRateLimiter as rateLimiter }; 