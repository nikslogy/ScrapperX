import Joi from 'joi';

const env = process.env.NODE_ENV || 'development';

/**
 * Validation schema for batch scraping
 */
export const batchScrapeSchema = Joi.object({
  urls: Joi.array()
    .items(Joi.string().uri())
    .min(1)
    .max(env === 'production' ? 10 : 100)
    .required()
    .messages({
      'array.min': 'At least 1 URL is required',
      'array.max': env === 'production'
        ? 'Maximum 10 URLs allowed per batch request'
        : 'Maximum 100 URLs allowed per batch request',
      'any.required': 'URLs array is required'
    }),
  options: Joi.object({
    userAgent: Joi.string().optional(),
    timeout: Joi.number().min(1000).max(120000).optional(),
    maxRetries: Joi.number().min(1).max(5).optional().default(3),
    forceMethod: Joi.string().valid('static', 'dynamic', 'stealth', 'adaptive', 'api').optional(),
    enableApiScraping: Joi.boolean().optional().default(true),
    enableDynamicScraping: Joi.boolean().optional().default(true),
    enableStealthScraping: Joi.boolean().optional().default(true),
    enableAdaptiveScraping: Joi.boolean().optional().default(true),
    respectRobots: Joi.boolean().optional().default(false),
    qualityThreshold: Joi.number().min(0).max(100).optional().default(70),
    captchaSolver: Joi.string().valid('manual', '2captcha', 'anticaptcha', 'skip').optional().default('skip'),
    captchaApiKey: Joi.string().optional().allow(''),
    stealthLevel: Joi.string().valid('basic', 'advanced', 'maximum').optional().default('advanced'),
    learningMode: Joi.boolean().optional().default(true),
    outputFormat: Joi.string().valid('json', 'markdown').optional().default('markdown')
  }).optional()
});
