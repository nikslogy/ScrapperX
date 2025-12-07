/**
 * Simple API Key Authentication Middleware
 * 
 * This provides basic protection for your API in production.
 * Set REQUIRE_API_KEY=true and API_KEYS=key1,key2,key3 in your .env
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Configuration from environment
const REQUIRE_API_KEY = process.env.REQUIRE_API_KEY === 'true';
const API_KEYS = new Set(
    (process.env.API_KEYS || '').split(',').filter(Boolean)
);

// Track failed attempts for rate limiting
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a secure API key
 */
export function generateApiKey(): string {
    return `scx_${crypto.randomBytes(24).toString('base64url')}`;
}

/**
 * Check if IP is locked out due to too many failed attempts
 */
function isLockedOut(ip: string): boolean {
    const record = failedAttempts.get(ip);
    if (!record) return false;

    const timeSinceLastAttempt = Date.now() - record.lastAttempt;

    // Reset if lockout period has passed
    if (timeSinceLastAttempt > LOCKOUT_DURATION) {
        failedAttempts.delete(ip);
        return false;
    }

    return record.count >= MAX_FAILED_ATTEMPTS;
}

/**
 * Record a failed authentication attempt
 */
function recordFailedAttempt(ip: string): void {
    const record = failedAttempts.get(ip);

    if (record) {
        record.count++;
        record.lastAttempt = Date.now();
    } else {
        failedAttempts.set(ip, { count: 1, lastAttempt: Date.now() });
    }
}

/**
 * Clear failed attempts for an IP
 */
function clearFailedAttempts(ip: string): void {
    failedAttempts.delete(ip);
}

/**
 * API Key Authentication Middleware
 * 
 * Checks for API key in:
 * 1. X-API-Key header
 * 2. Authorization: Bearer <key> header
 * 3. ?api_key=<key> query parameter
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
    // Skip authentication if not required
    if (!REQUIRE_API_KEY) {
        return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    // Check for lockout
    if (isLockedOut(ip)) {
        res.status(429).json({
            success: false,
            error: 'Too Many Failed Attempts',
            message: 'Your IP has been temporarily locked due to too many failed authentication attempts. Please try again later.',
            retryAfter: Math.ceil(LOCKOUT_DURATION / 1000)
        });
        return;
    }

    // Extract API key from various sources
    let apiKey: string | undefined;

    // 1. X-API-Key header
    apiKey = req.headers['x-api-key'] as string;

    // 2. Authorization: Bearer <key>
    if (!apiKey) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            apiKey = authHeader.slice(7);
        }
    }

    // 3. Query parameter (less secure, but convenient for testing)
    if (!apiKey && req.query.api_key) {
        apiKey = req.query.api_key as string;
    }

    // Validate API key
    if (!apiKey) {
        recordFailedAttempt(ip);
        res.status(401).json({
            success: false,
            error: 'Authentication Required',
            message: 'API key is required. Include it in the X-API-Key header, Authorization: Bearer header, or api_key query parameter.'
        });
        return;
    }

    if (!API_KEYS.has(apiKey)) {
        recordFailedAttempt(ip);
        res.status(401).json({
            success: false,
            error: 'Invalid API Key',
            message: 'The provided API key is not valid.'
        });
        return;
    }

    // Valid API key - clear failed attempts and continue
    clearFailedAttempts(ip);

    // Add API key identifier to request for logging
    (req as any).apiKeyId = apiKey.slice(0, 8) + '...';

    next();
}

/**
 * Optional authentication - allows both authenticated and unauthenticated requests
 * but marks the request with authentication status
 */
export function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction): void {
    // Extract API key from various sources
    let apiKey: string | undefined;
    apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            apiKey = authHeader.slice(7);
        }
    }

    if (!apiKey && req.query.api_key) {
        apiKey = req.query.api_key as string;
    }

    // Mark request with authentication status
    (req as any).isAuthenticated = apiKey ? API_KEYS.has(apiKey) : false;
    (req as any).apiKeyId = apiKey && API_KEYS.has(apiKey) ? apiKey.slice(0, 8) + '...' : undefined;

    next();
}

export default { apiKeyAuth, optionalApiKeyAuth, generateApiKey };
