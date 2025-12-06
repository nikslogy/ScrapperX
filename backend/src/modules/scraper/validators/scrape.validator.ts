import Joi from 'joi';

/**
 * Validation schema for URL-only requests (robots check)
 */
export const urlSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid URL',
    'any.required': 'URL is required'
  }),
  userAgent: Joi.string().optional().default('ScrapperX-Bot')
});

/**
 * Validation schema for scrape requests
 */
export const scrapeSchema = Joi.object({
  url: Joi.string().uri().required().messages({
    'string.uri': 'Please provide a valid URL',
    'any.required': 'URL is required'
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
    learningMode: Joi.boolean().optional().default(true)
  }).optional()
});

/**
 * Validation schema for adaptive profile import
 */
export const importProfilesSchema = Joi.object({
  profiles: Joi.string().required().messages({
    'any.required': 'Profiles data is required as JSON string'
  })
});
