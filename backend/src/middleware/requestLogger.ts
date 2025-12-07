/**
 * Request Logger Middleware
 * 
 * Logs all incoming requests for security audit and debugging.
 * Essential for identifying malicious activity patterns.
 */

import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Log to file in production
const LOG_TO_FILE = process.env.NODE_ENV === 'production';
const LOG_FILE = path.join(process.cwd(), 'logs', 'requests.log');

// Ensure logs directory exists
if (LOG_TO_FILE) {
    const logsDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
}

interface RequestLogEntry {
    timestamp: string;
    method: string;
    path: string;
    ip: string;
    userAgent: string;
    statusCode?: number;
    duration?: number;
    apiKeyId?: string;
    error?: string;
}

/**
 * Format log entry as JSON line
 */
function formatLogEntry(entry: RequestLogEntry): string {
    return JSON.stringify(entry);
}

/**
 * Write log entry to file
 */
function writeToFile(entry: string): void {
    if (!LOG_TO_FILE) return;

    fs.appendFile(LOG_FILE, entry + '\n', (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

/**
 * Get client IP address, handling proxies
 */
function getClientIP(req: Request): string {
    // Trust X-Forwarded-For only if behind a reverse proxy
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor && process.env.TRUST_PROXY === 'true') {
        const ips = (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0])
            .split(',')
            .map(ip => ip.trim());
        return ips[0];
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    const logEntry: RequestLogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        apiKeyId: (req as any).apiKeyId
    };

    // Log request details on response finish
    res.on('finish', () => {
        logEntry.statusCode = res.statusCode;
        logEntry.duration = Date.now() - startTime;

        const logString = formatLogEntry(logEntry);

        // Console output (color-coded by status)
        if (process.env.NODE_ENV !== 'production') {
            const statusColor = res.statusCode >= 500 ? '\x1b[31m' : // Red for server errors
                res.statusCode >= 400 ? '\x1b[33m' : // Yellow for client errors
                    res.statusCode >= 300 ? '\x1b[36m' : // Cyan for redirects
                        '\x1b[32m'; // Green for success
            const reset = '\x1b[0m';

            console.log(
                `${statusColor}${req.method} ${req.originalUrl}${reset}`,
                `${res.statusCode}`,
                `${logEntry.duration}ms`,
                `[${logEntry.ip}]`
            );
        }

        // Write to file in production
        writeToFile(logString);
    });

    // Log errors
    res.on('error', (error) => {
        logEntry.error = error.message;
        const logString = formatLogEntry(logEntry);
        writeToFile(logString);
        console.error('Request error:', error);
    });

    next();
}

/**
 * Security event logger for suspicious activity
 */
export function logSecurityEvent(event: {
    type: 'rate_limit' | 'auth_failure' | 'invalid_url' | 'blocked_ip' | 'suspicious';
    ip: string;
    details: string;
    path?: string;
}): void {
    const entry = {
        timestamp: new Date().toISOString(),
        type: 'SECURITY',
        event: event.type,
        ip: event.ip,
        details: event.details,
        path: event.path
    };

    console.warn('🚨 Security Event:', JSON.stringify(entry));

    if (LOG_TO_FILE) {
        const securityLogFile = path.join(process.cwd(), 'logs', 'security.log');
        fs.appendFile(securityLogFile, JSON.stringify(entry) + '\n', (err) => {
            if (err) console.error('Failed to write security log:', err);
        });
    }
}

export default { requestLogger, logSecurityEvent };
