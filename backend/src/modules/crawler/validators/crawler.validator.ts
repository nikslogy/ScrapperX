import Joi from 'joi';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Validation schema for starting a domain crawl
 */
export const startCrawlSchema = Joi.object({
  url: Joi.string().uri().required(),
  config: Joi.object({
    maxPages: Joi.number().integer().min(1).max(isProduction ? 200 : 10000).default(100),
    maxDepth: Joi.number().integer().min(1).max(10).default(5),
    respectRobots: Joi.boolean().default(true),
    delay: Joi.number().integer().min(0).max(10000).default(1000),
    concurrent: Joi.number().integer().min(1).max(10).default(3),
    includePatterns: Joi.array().items(Joi.string()).default([]),
    excludePatterns: Joi.array().items(Joi.string()).default([]),
    userAgent: Joi.string().optional(),
    timeout: Joi.number().integer().min(5000).max(120000).default(30000),
    authentication: Joi.object({
      type: Joi.string().valid('none', 'basic', 'form', 'bearer', 'cookie').default('none'),
      credentials: Joi.object({
        username: Joi.string().optional(),
        password: Joi.string().optional(),
        token: Joi.string().optional(),
        cookies: Joi.object().optional(),
        loginUrl: Joi.string().uri().optional(),
        usernameField: Joi.string().default('username'),
        passwordField: Joi.string().default('password'),
        submitSelector: Joi.string().default('input[type="submit"], button[type="submit"]'),
        successIndicator: Joi.string().optional()
      }).optional()
    }).optional(),
    extraction: Joi.object({
      enableStructuredData: Joi.boolean().default(true),
      customSelectors: Joi.object().optional(),
      dataTypes: Joi.array().items(Joi.string()).optional(),
      qualityThreshold: Joi.number().min(0).max(1).default(0.7)
    }).optional(),
    forceMethod: Joi.string().valid('static', 'dynamic', 'stealth', 'adaptive', 'api').optional(),
    enableApiScraping: Joi.boolean().optional().default(true),
    enableDynamicScraping: Joi.boolean().optional().default(true),
    enableStealthScraping: Joi.boolean().optional().default(true),
    enableAdaptiveScraping: Joi.boolean().optional().default(true),
    captchaSolver: Joi.string().valid('manual', '2captcha', 'anticaptcha', 'skip').optional().default('skip'),
    captchaApiKey: Joi.string().optional().allow(''),
    stealthLevel: Joi.string().valid('basic', 'advanced', 'maximum').optional().default('advanced'),
    learningMode: Joi.boolean().optional().default(true)
  }).default({})
});

/**
 * Validation schema for test authentication endpoint
 */
export const testAuthSchema = Joi.object({
  url: Joi.string().uri().required(),
  authentication: Joi.object({
    type: Joi.string().valid('basic', 'form', 'bearer', 'cookie').required(),
    credentials: Joi.object({
      username: Joi.string().optional(),
      password: Joi.string().optional(),
      token: Joi.string().optional(),
      cookies: Joi.object().optional(),
      loginUrl: Joi.string().uri().optional(),
      usernameField: Joi.string().default('username'),
      passwordField: Joi.string().default('password'),
      submitSelector: Joi.string().default('input[type="submit"], button[type="submit"]'),
      successIndicator: Joi.string().optional()
    }).required()
  }).required()
});
