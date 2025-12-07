/**
 * URL Validator - Prevents SSRF (Server-Side Request Forgery) attacks
 * This is CRITICAL for security - blocks requests to internal/private networks
 */

import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// Private/internal IP ranges that should NEVER be accessed
const BLOCKED_IP_RANGES = [
    // Loopback
    /^127\./,
    /^::1$/,
    /^localhost$/i,

    // Private networks (RFC 1918)
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,

    // Link-local
    /^169\.254\./,
    /^fe80:/i,

    // AWS/Cloud metadata endpoints
    /^169\.254\.169\.254$/,
    /^fd00:/i,

    // Multicast
    /^224\./,
    /^ff/i,

    // Reserved
    /^0\./,
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
    /^192\.0\.0\./,
    /^192\.0\.2\./,
    /^198\.51\.100\./,
    /^203\.0\.113\./,
    /^240\./,
    /^255\./,
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
    'localhost',
    'metadata.google.internal',
    'metadata',
    'kubernetes.default',
    'kubernetes.default.svc',
];

// Allowed protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Blocked file extensions that could be dangerous
const BLOCKED_EXTENSIONS = [
    '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1',
    '.msi', '.dmg', '.pkg', '.deb', '.rpm'
];

export interface ValidationResult {
    valid: boolean;
    reason?: string;
    sanitizedUrl?: string;
}

/**
 * Check if an IP address is in a blocked range
 */
function isBlockedIP(ip: string): boolean {
    return BLOCKED_IP_RANGES.some(pattern => pattern.test(ip));
}

/**
 * Check if hostname is blocked
 */
function isBlockedHostname(hostname: string): boolean {
    const lowerHostname = hostname.toLowerCase();
    return BLOCKED_HOSTNAMES.some(blocked =>
        lowerHostname === blocked || lowerHostname.endsWith('.' + blocked)
    );
}

/**
 * Validates a URL for safe scraping
 * CRITICAL: This prevents SSRF attacks
 */
export async function validateUrl(urlString: string): Promise<ValidationResult> {
    try {
        // Basic URL parsing
        let url: URL;
        try {
            url = new URL(urlString);
        } catch {
            return { valid: false, reason: 'Invalid URL format' };
        }

        // Check protocol
        if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
            return {
                valid: false,
                reason: `Protocol not allowed: ${url.protocol}. Only HTTP and HTTPS are permitted.`
            };
        }

        // Check for blocked hostnames
        if (isBlockedHostname(url.hostname)) {
            return {
                valid: false,
                reason: `Hostname not allowed: ${url.hostname}`
            };
        }

        // Check if hostname is an IP address
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const ipv6Regex = /^\[?([a-fA-F0-9:]+)\]?$/;

        if (ipv4Regex.test(url.hostname) || ipv6Regex.test(url.hostname)) {
            if (isBlockedIP(url.hostname)) {
                return {
                    valid: false,
                    reason: `IP address not allowed: ${url.hostname}`
                };
            }
        } else {
            // Resolve hostname to check actual IP
            try {
                const { address } = await dnsLookup(url.hostname);
                if (isBlockedIP(address)) {
                    return {
                        valid: false,
                        reason: `Hostname resolves to blocked IP: ${address}`
                    };
                }
            } catch (dnsError) {
                // DNS resolution failed - could be a valid external URL or could be an attack
                // Allow it but log the issue
                console.warn(`DNS resolution failed for ${url.hostname}:`, dnsError);
                // For strict security, you could return invalid here
                // return { valid: false, reason: `DNS resolution failed for ${url.hostname}` };
            }
        }

        // Check for blocked file extensions
        const pathname = url.pathname.toLowerCase();
        if (BLOCKED_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
            return {
                valid: false,
                reason: `File extension not allowed: ${pathname.split('.').pop()}`
            };
        }

        // Check for suspiciously long URLs (could be used in attacks)
        if (urlString.length > 2048) {
            return { valid: false, reason: 'URL too long (max 2048 characters)' };
        }

        // Check for embedded credentials
        if (url.username || url.password) {
            return { valid: false, reason: 'URLs with embedded credentials are not allowed' };
        }

        return {
            valid: true,
            sanitizedUrl: url.toString()
        };

    } catch (error) {
        console.error('URL validation error:', error);
        return { valid: false, reason: 'URL validation failed' };
    }
}

/**
 * Validate an array of URLs
 */
export async function validateUrls(urls: string[]): Promise<{
    valid: string[];
    invalid: Array<{ url: string; reason: string }>;
}> {
    const results = await Promise.all(urls.map(async url => ({
        url,
        result: await validateUrl(url)
    })));

    const valid: string[] = [];
    const invalid: Array<{ url: string; reason: string }> = [];

    for (const { url, result } of results) {
        if (result.valid) {
            valid.push(result.sanitizedUrl || url);
        } else {
            invalid.push({ url, reason: result.reason || 'Unknown error' });
        }
    }

    return { valid, invalid };
}

/**
 * Sanitize a filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
    // Remove any path components
    const basename = filename.split(/[\\/]/).pop() || '';

    // Remove null bytes and other dangerous characters
    const sanitized = basename
        .replace(/\0/g, '')
        .replace(/\.\./g, '')
        .replace(/[<>:"|?*]/g, '')
        .trim();

    // Ensure it's not empty and has a safe extension
    if (!sanitized || sanitized.startsWith('.')) {
        throw new Error('Invalid filename');
    }

    // Only allow alphanumeric, dash, underscore, and dot
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(sanitized)) {
        throw new Error('Filename contains invalid characters');
    }

    return sanitized;
}

export default {
    validateUrl,
    validateUrls,
    sanitizeFilename
};
