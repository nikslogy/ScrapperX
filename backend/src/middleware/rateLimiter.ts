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

// Check production at runtime (NOT at module load time!)
const isProduction = (): boolean => process.env.NODE_ENV === 'production';

// Get valid API keys from environment (also runtime)
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
  general: { prod: 5, dev: 50 },
  scrape: { prod: 3, dev: 50 },
  batch: { prod: 1, dev: 20 },
  crawler: { prod: 0, dev: 20 },
};

// ---- API KEY USERS (Authenticated) ----
const API_KEY_LIMITS = {
  general: { prod: 100, dev: 1000 },
  scrape: { prod: 20, dev: 100 },
  batch: { prod: 5, dev: 50 },
  crawler: { prod: 3, dev: 20 },
};

// ---- PREMIUM API KEY USERS (scx_premium_...) ----
const PREMIUM_LIMITS = {
  general: { prod: 1000, dev: 10000 },
  scrape: { prod: 200, dev: 1000 },
  batch: { prod: 50, dev: 500 },
  crawler: { prod: 30, dev: 200 },
};

// ============================================
// Rate Limiters (Lazy initialization)
// ============================================
// These are created on first use to ensure NODE_ENV is loaded

let _anonymousLimiter: RateLimiterMemory | null = null;
let _authenticatedLimiter: RateLimiterMemory | null = null;
let _premiumLimiter: RateLimiterMemory | null = null;
let _anonymousScrapeLimiter: RateLimiterMemory | null = null;
let _authenticatedScrapeLimiter: RateLimiterMemory | null = null;
let _premiumScrapeLimiter: RateLimiterMemory | null = null;
let _anonymousBatchLimiter: RateLimiterMemory | null = null;
let _authenticatedBatchLimiter: RateLimiterMemory | null = null;
let _premiumBatchLimiter: RateLimiterMemory | null = null;
let _authenticatedCrawlerLimiter: RateLimiterMemory | null = null;
let _premiumCrawlerLimiter: RateLimiterMemory | null = null;

const getAnonymousLimiter = (): RateLimiterMemory => {
  if (!_anonymousLimiter) {
    const isProd = isProduction();
    _anonymousLimiter = new RateLimiterMemory({
      points: isProd ? FREE_LIMITS.general.prod : FREE_LIMITS.general.dev,
      duration: isProd ? 3600 : 60,
      blockDuration: isProd ? 3600 : 60,
    });
  }
  return _anonymousLimiter;
};

const getAuthenticatedLimiter = (): RateLimiterMemory => {
  if (!_authenticatedLimiter) {
    const isProd = isProduction();
    _authenticatedLimiter = new RateLimiterMemory({
      points: isProd ? API_KEY_LIMITS.general.prod : API_KEY_LIMITS.general.dev,
      duration: 60,
      blockDuration: 60,
    });
  }
  return _authenticatedLimiter;
};

const getPremiumLimiter = (): RateLimiterMemory => {
  if (!_premiumLimiter) {
    const isProd = isProduction();
    _premiumLimiter = new RateLimiterMemory({
      points: isProd ? PREMIUM_LIMITS.general.prod : PREMIUM_LIMITS.general.dev,
      duration: 60,
      blockDuration: 60,
    });
  }
  return _premiumLimiter;
};

const getAnonymousScrapeLimiter = (): RateLimiterMemory => {
  if (!_anonymousScrapeLimiter) {
    const isProd = isProduction();
    _anonymousScrapeLimiter = new RateLimiterMemory({
      points: isProd ? FREE_LIMITS.scrape.prod : FREE_LIMITS.scrape.dev,
      duration: isProd ? 3600 : 60,
      blockDuration: isProd ? 3600 : 60,
    });
  }
  return _anonymousScrapeLimiter;
};

const getAuthenticatedScrapeLimiter = (): RateLimiterMemory => {
  if (!_authenticatedScrapeLimiter) {
    const isProd = isProduction();
    _authenticatedScrapeLimiter = new RateLimiterMemory({
      points: isProd ? API_KEY_LIMITS.scrape.prod : API_KEY_LIMITS.scrape.dev,
      duration: 60,
      blockDuration: 120,
    });
  }
  return _authenticatedScrapeLimiter;
};

const getPremiumScrapeLimiter = (): RateLimiterMemory => {
  if (!_premiumScrapeLimiter) {
    const isProd = isProduction();
    _premiumScrapeLimiter = new RateLimiterMemory({
      points: isProd ? PREMIUM_LIMITS.scrape.prod : PREMIUM_LIMITS.scrape.dev,
      duration: 60,
      blockDuration: 60,
    });
  }
  return _premiumScrapeLimiter;
};

const getAnonymousBatchLimiter = (): RateLimiterMemory => {
  if (!_anonymousBatchLimiter) {
    const isProd = isProduction();
    _anonymousBatchLimiter = new RateLimiterMemory({
      points: isProd ? FREE_LIMITS.batch.prod : FREE_LIMITS.batch.dev,
      duration: isProd ? 3600 : 300,
      blockDuration: isProd ? 3600 : 300,
    });
  }
  return _anonymousBatchLimiter;
};

const getAuthenticatedBatchLimiter = (): RateLimiterMemory => {
  if (!_authenticatedBatchLimiter) {
    const isProd = isProduction();
    _authenticatedBatchLimiter = new RateLimiterMemory({
      points: isProd ? API_KEY_LIMITS.batch.prod : API_KEY_LIMITS.batch.dev,
      duration: 300,
      blockDuration: 300,
    });
  }
  return _authenticatedBatchLimiter;
};

const getPremiumBatchLimiter = (): RateLimiterMemory => {
  if (!_premiumBatchLimiter) {
    const isProd = isProduction();
    _premiumBatchLimiter = new RateLimiterMemory({
      points: isProd ? PREMIUM_LIMITS.batch.prod : PREMIUM_LIMITS.batch.dev,
      duration: 300,
      blockDuration: 300,
    });
  }
  return _premiumBatchLimiter;
};

const getAuthenticatedCrawlerLimiter = (): RateLimiterMemory => {
  if (!_authenticatedCrawlerLimiter) {
    const isProd = isProduction();
    _authenticatedCrawlerLimiter = new RateLimiterMemory({
      points: isProd ? API_KEY_LIMITS.crawler.prod : API_KEY_LIMITS.crawler.dev,
      duration: 300,
      blockDuration: 600,
    });
  }
  return _authenticatedCrawlerLimiter;
};

const getPremiumCrawlerLimiter = (): RateLimiterMemory => {
  if (!_premiumCrawlerLimiter) {
    const isProd = isProduction();
    _premiumCrawlerLimiter = new RateLimiterMemory({
      points: isProd ? PREMIUM_LIMITS.crawler.prod : PREMIUM_LIMITS.crawler.dev,
      duration: 300,
      blockDuration: 300,
    });
  }
  return _premiumCrawlerLimiter;
};

// ============================================
// Helper Functions
// ============================================

function extractApiKey(req: Request): string | null {
  const headerKey = req.headers['x-api-key'];
  if (headerKey && typeof headerKey === 'string') {
    return headerKey;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  if (req.query.api_key && typeof req.query.api_key === 'string') {
    return req.query.api_key;
  }

  return null;
}

function isValidApiKey(key: string | null): boolean {
  if (!key) return false;
  const validKeys = getApiKeys();
  return validKeys.has(key);
}

function getClientId(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getUserTier(apiKey: string | null, isValid: boolean): 'anonymous' | 'authenticated' | 'premium' {
  if (!isValid) return 'anonymous';
  if (isPremiumKey(apiKey)) return 'premium';
  return 'authenticated';
}

// ============================================
// Rate Limiting Middleware
// ============================================

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;
  const isProd = isProduction();

  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;
  (req as any).isPremium = tier === 'premium';

  try {
    const limiter = tier === 'premium' ? getPremiumLimiter()
      : tier === 'authenticated' ? getAuthenticatedLimiter()
        : getAnonymousLimiter();
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
        ? (isProd ? '1000 requests per minute' : '10000 requests per minute')
        : tier === 'authenticated'
          ? (isProd ? '100 requests per minute' : '1000 requests per minute')
          : (isProd ? '5 requests per hour' : '50 requests per minute'),
      getApiKey: tier === 'anonymous' ? 'Contact admin or visit /docs for API key information' : undefined,
    });
  }
};

export const scrapeRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;
  const isProd = isProduction();

  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;

  try {
    const limiter = tier === 'premium' ? getPremiumScrapeLimiter()
      : tier === 'authenticated' ? getAuthenticatedScrapeLimiter()
        : getAnonymousScrapeLimiter();
    await limiter.consume(clientId);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Scraping Rate Limit Exceeded',
      message: tier === 'anonymous'
        ? `Anonymous users are limited to ${isProd ? '3 scrapes per hour' : '50 per minute'}. Get an API key for more.`
        : `Too many scraping requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      tier: tier,
      limit: tier === 'premium'
        ? (isProd ? '200 requests per minute' : '1000 requests per minute')
        : tier === 'authenticated'
          ? (isProd ? '20 requests per minute' : '100 requests per minute')
          : (isProd ? '3 requests per hour' : '50 requests per minute')
    });
  }
};

export const batchScrapeRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;
  const isProd = isProduction();

  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;

  try {
    const limiter = tier === 'premium' ? getPremiumBatchLimiter()
      : tier === 'authenticated' ? getAuthenticatedBatchLimiter()
        : getAnonymousBatchLimiter();
    await limiter.consume(clientId);
    next();
  } catch (rejRes: any) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      success: false,
      error: 'Batch Scraping Rate Limit Exceeded',
      message: tier === 'anonymous'
        ? `Anonymous users are limited to ${isProd ? '1 batch per hour' : '20 per 5 minutes'}. Get an API key for more.`
        : `Too many batch scraping requests. Try again in ${secs} seconds.`,
      retryAfter: secs,
      tier: tier,
      limit: tier === 'premium'
        ? (isProd ? '50 requests per 5 minutes (10 URLs each)' : '500 requests per 5 minutes')
        : tier === 'authenticated'
          ? (isProd ? '5 requests per 5 minutes (10 URLs each)' : '50 requests per 5 minutes')
          : (isProd ? '1 request per hour (10 URLs max)' : '20 requests per 5 minutes')
    });
  }
};

export const crawlerRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const apiKey = extractApiKey(req);
  const isAuthenticated = isValidApiKey(apiKey);
  const tier = getUserTier(apiKey, isAuthenticated);
  const clientId = tier === 'anonymous' ? `anon:${getClientId(req)}` : `${tier}:${apiKey?.slice(0, 12)}`;
  const isProd = isProduction();

  (req as any).isAuthenticated = isAuthenticated;
  (req as any).clientType = tier;

  // In production, crawler requires authentication
  if (isProd && tier === 'anonymous') {
    res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'Domain crawler requires an API key in production. Contact admin for access.',
      tier: 'anonymous'
    });
    return;
  }

  try {
    const limiter = tier === 'premium' ? getPremiumCrawlerLimiter() : getAuthenticatedCrawlerLimiter();
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
        ? (isProd ? '30 requests per 5 minutes (200 pages each)' : '200 requests per 5 minutes')
        : (isProd ? '3 requests per 5 minutes (200 pages max)' : '20 requests per 5 minutes')
    });
  }
};

// Keep old export names for compatibility
export { rateLimiter as generalRateLimiter };
