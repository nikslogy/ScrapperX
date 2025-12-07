/**
 * Hybrid Rate Limiter with API Key Support
 * 
 * This provides tiered rate limiting:
 * - Anonymous users: Very limited (3-5 requests/hour) - for trying the API
 * - API key users: Full access (20 requests/min) - for real usage
 * - Premium API key users: 10x higher limits - for heavy usage
 * 
 * Premium keys start with 'scx_premium_' prefix.
 * 
 * This prevents abuse while still allowing people to try the API.
 */

import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

// Get valid API keys from environment
const getApiKeys = (): Set<string> => {
  const keys = process.env.API_KEYS || '';
  return new Set(keys.split(',').filter(k => k.trim().length > 0));
};

// Check if key is premium (starts with scx_premium_)
const isPremiumKey = (key: string | null): boolean => {
  return key?.startsWith('scx_premium_') || false;
};

// ============================================
// 🎯 RATE LIMIT CONFIGURATION
// ============================================
// 
// MODIFY THESE VALUES TO CHANGE RATE LIMITS!
// 
// Format: { production_limit, development_limit }
// Development limits are much higher for testing locally
//
// ============================================

// ---- FREE USERS (Anonymous - No API Key) ----
const FREE_LIMITS = {
  general: { prod: 5, dev: 50 },           // General API requests per hour (prod) / per minute (dev)
  scrape: { prod: 3, dev: 50 },            // Quick scrapes per hour (prod) / per minute (dev)
  batch: { prod: 1, dev: 20 },             // Batch scrapes per hour (prod) / per 5 minutes (dev)
  crawler: { prod: 0, dev: 20 },           // Crawler disabled in prod for free users
};

// ---- API KEY USERS (Authenticated) ----
const API_KEY_LIMITS = {
  general: { prod: 100, dev: 1000 },       // General API requests per minute
  scrape: { prod: 20, dev: 100 },          // Quick scrapes per minute
  batch: { prod: 5, dev: 50 },             // Batch scrapes per 5 minutes
  crawler: { prod: 3, dev: 20 },           // Crawler requests per 5 minutes
};

// ---- PREMIUM API KEY USERS (scx_premium_...) ----
const PREMIUM_LIMITS = {
  general: { prod: 1000, dev: 10000 },     // 10x higher than regular API key
  scrape: { prod: 200, dev: 1000 },        // 10x higher
  batch: { prod: 50, dev: 500 },           // 10x higher
  crawler: { prod: 30, dev: 200 },         // 10x higher
};

// ============================================
// Rate Limiters (using the config above)
// ============================================

// Anonymous users - very strict limits (for trying the API)
const anonymousLimiter = new RateLimiterMemory({
  points: isProduction ? FREE_LIMITS.general.prod : FREE_LIMITS.general.dev,
  duration: isProduction ? 3600 : 60,  // Per hour in production, per minute in dev
  blockDuration: isProduction ? 3600 : 60,
});

// Authenticated users - normal limits
const authenticatedLimiter = new RateLimiterMemory({
  points: isProduction ? API_KEY_LIMITS.general.prod : API_KEY_LIMITS.general.dev,
  duration: 60,
  blockDuration: 60,
});

// Premium users - 10x higher limits
const premiumLimiter = new RateLimiterMemory({
  points: isProduction ? PREMIUM_LIMITS.general.prod : PREMIUM_LIMITS.general.dev,
  duration: 60,
  blockDuration: 60,
});

// Scrape endpoint - stricter for anonymous
const anonymousScrapeLimiter = new RateLimiterMemory({
  points: isProduction ? FREE_LIMITS.scrape.prod : FREE_LIMITS.scrape.dev,
  duration: isProduction ? 3600 : 60,
  blockDuration: isProduction ? 3600 : 60,
});

const authenticatedScrapeLimiter = new RateLimiterMemory({
  points: isProduction ? API_KEY_LIMITS.scrape.prod : API_KEY_LIMITS.scrape.dev,
  duration: 60,
  blockDuration: 120,
});

const premiumScrapeLimiter = new RateLimiterMemory({
  points: isProduction ? PREMIUM_LIMITS.scrape.prod : PREMIUM_LIMITS.scrape.dev,
  duration: 60,
  blockDuration: 60,
});

// Batch scrape - very strict for anonymous
const anonymousBatchLimiter = new RateLimiterMemory({
  points: isProduction ? FREE_LIMITS.batch.prod : FREE_LIMITS.batch.dev,
  duration: isProduction ? 3600 : 300,
  blockDuration: isProduction ? 3600 : 300,
});

const authenticatedBatchLimiter = new RateLimiterMemory({
  points: isProduction ? API_KEY_LIMITS.batch.prod : API_KEY_LIMITS.batch.dev,
  duration: 300,
  blockDuration: 300,
});

const premiumBatchLimiter = new RateLimiterMemory({
  points: isProduction ? PREMIUM_LIMITS.batch.prod : PREMIUM_LIMITS.batch.dev,
  duration: 300,
  blockDuration: 300,
});

// Crawler - disabled for anonymous in production
const authenticatedCrawlerLimiter = new RateLimiterMemory({
  points: isProduction ? API_KEY_LIMITS.crawler.prod : API_KEY_LIMITS.crawler.dev,
  duration: 300,
  blockDuration: 600,
});

const premiumCrawlerLimiter = new RateLimiterMemory({
  points: isProduction ? 30 : 200,    // 30 crawls per 5 minutes for premium
  duration: 300,
  blockDuration: 300,
});

// ============================================
// Helper Functions
// ============================================

/**
 * Extract API key from request
 */
function extractApiKey(req: Request): string | null {
  // Check X-API-Key header
  const headerKey = req.headers['x-api-key'];
  if (headerKey && typeof headerKey === 'string') {
    return headerKey;
  }

  // Check Authorization: Bearer <key>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check query parameter (for easy testing)
  if (req.query.api_key && typeof req.query.api_key === 'string') {
    return req.query.api_key;
  }

  return null;
}

/**
 * Check if API key is valid
 */
function isValidApiKey(key: string | null): boolean {
  if (!key) return false;
  const validKeys = getApiKeys();
  return validKeys.has(key);
}

/**
 * Get client identifier (IP or API key)
 */
function getClientId(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

// ============================================
// Rate Limiting Middleware
// ============================================

/**
 * Get the appropriate tier for rate limiting
 */
function getUserTier(apiKey: string | null, isValid: boolean): 'anonymous' | 'authenticated' | 'premium' {
  if (!isValid) return 'anonymous';
  if (isPremiumKey(apiKey)) return 'premium';
  return 'authenticated';
}

/**
 * General API rate limiter
 * Different limits for anonymous vs authenticated vs premium
 */
export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;

  // Add auth status to request for logging
  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;
  (req as any).isPremium = tier === 'premium';

  try {
    const limiter = tier === 'premium' ? premiumLimiter
      : tier === 'authenticated' ? authenticatedLimiter
        : anonymousLimiter;
    await limiter.consume(clientId);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: tier === 'anonymous'
        ? `Anonymous rate limit exceeded. Get an API key for higher limits or try again in ${secs} seconds.`
        : `Rate limit exceeded. Try again in ${secs} seconds.`,
      retryAfter: secs,
      tier: tier,
      limit: tier === 'premium'
        ? (isProduction ? '1000 requests per minute' : '10000 requests per minute')
        : tier === 'authenticated'
          ? (isProduction ? '100 requests per minute' : '1000 requests per minute')
          : (isProduction ? '5 requests per hour' : '50 requests per minute'),
      getApiKey: tier === 'anonymous' ? 'Contact admin or visit /docs for API key information' : undefined,
      upgradeToPremium: tier === 'authenticated' ? 'Contact admin for a premium API key with 10x higher limits' : undefined
    });
  }
};

/**
 * Scrape endpoint rate limiter
 */
export const scrapeRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;

  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;

  try {
    const limiter = tier === 'premium' ? premiumScrapeLimiter
      : tier === 'authenticated' ? authenticatedScrapeLimiter
        : anonymousScrapeLimiter;
    await limiter.consume(clientId);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Scraping Rate Limit Exceeded',
      message: tier === 'anonymous'
        ? `Anonymous users are limited to ${isProduction ? '3 scrapes per hour' : '50 per minute'}. Get an API key for more.`
        : `Too many scraping requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      tier: tier,
      limit: tier === 'premium'
        ? (isProduction ? '200 requests per minute' : '1000 requests per minute')
        : tier === 'authenticated'
          ? (isProduction ? '20 requests per minute' : '100 requests per minute')
          : (isProduction ? '3 requests per hour' : '50 requests per minute')
    });
  }
};

/**
 * Batch scrape rate limiter
 */
export const batchScrapeRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;

  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;

  try {
    const limiter = tier === 'premium' ? premiumBatchLimiter
      : tier === 'authenticated' ? authenticatedBatchLimiter
        : anonymousBatchLimiter;
    await limiter.consume(clientId);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Batch Scraping Rate Limit Exceeded',
      message: tier === 'anonymous'
        ? `Anonymous users are limited to ${isProduction ? '1 batch per hour' : '20 per 5 minutes'}. Get an API key for more.`
        : `Too many batch scraping requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      tier: tier,
      limit: tier === 'premium'
        ? (isProduction ? '50 requests per 5 minutes (10 URLs each)' : '500 requests per 5 minutes')
        : tier === 'authenticated'
          ? (isProduction ? '5 requests per 5 minutes (10 URLs each)' : '50 requests per 5 minutes')
          : (isProduction ? '1 request per hour (10 URLs max)' : '20 requests per 5 minutes')
    });
  }
};

/**
 * Crawler rate limiter - requires authentication in production
 */
export const crawlerRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;

  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;

  // In production, crawler requires authentication
  if (isProduction && tier === 'anonymous') {
    res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'Domain crawler requires an API key in production. Contact admin for access.',
      tier: 'anonymous'
    });
    return;
  }

  try {
    const limiter = tier === 'premium' ? premiumCrawlerLimiter : authenticatedCrawlerLimiter;
    await limiter.consume(clientId);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Crawler Rate Limit Exceeded',
      message: `Too many crawler requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      tier: tier,
      limit: tier === 'premium'
        ? (isProduction ? '30 requests per 5 minutes (200 pages each)' : '200 requests per 5 minutes')
        : (isProduction ? '3 requests per 5 minutes (200 pages max)' : '20 requests per 5 minutes')
    });
  }
};

// Keep old export names for compatibility
export { rateLimiter as generalRateLimiter };
