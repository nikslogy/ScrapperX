import axios from 'axios';
import robotsParser from 'robots-parser';
import { URL } from 'url';

export interface RobotsInfo {
  url: string;
  robotsUrl: string;
  isAllowed: boolean;
  userAgent: string;
  crawlDelay?: number;
  sitemaps: string[];
  rules: Array<{
    userAgent: string;
    allow: string[];
    disallow: string[];
  }>;
  rawContent?: string;
  error?: string;
}

export class RobotsChecker {
  private static DEFAULT_USER_AGENT = 'ScrapperX-Bot';
  private static TIMEOUT = 5000; // 5 seconds

  static async checkRobots(url: string, userAgent: string = this.DEFAULT_USER_AGENT): Promise<RobotsInfo> {
    try {
      const parsedUrl = new URL(url);
      const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;

      const result: RobotsInfo = {
        url,
        robotsUrl,
        isAllowed: false,
        userAgent,
        sitemaps: [],
        rules: []
      };

      try {
        // Fetch robots.txt
        const response = await axios.get(robotsUrl, {
          timeout: this.TIMEOUT,
          headers: {
            'User-Agent': userAgent
          },
          validateStatus: (status) => status < 500 // Accept 404 as valid (no robots.txt)
        });

        if (response.status === 404) {
          // No robots.txt found - scraping is allowed by default
          result.isAllowed = true;
          result.error = 'No robots.txt found (scraping allowed by default)';
          return result;
        }

        const robotsContent = response.data;
        result.rawContent = robotsContent;

        // Parse robots.txt
        const robots = robotsParser(robotsUrl, robotsContent);

        // Check if scraping is allowed for the specific URL
        result.isAllowed = robots.isAllowed(url, userAgent) || false;

        // Get crawl delay
        const crawlDelay = robots.getCrawlDelay(userAgent);
        if (crawlDelay !== undefined) {
          result.crawlDelay = crawlDelay;
        }

        // Extract sitemaps
        result.sitemaps = robots.getSitemaps();

        // Parse rules manually for detailed info
        result.rules = this.parseRobotsRules(robotsContent);

        return result;

      } catch (fetchError: any) {
        if (fetchError.code === 'ENOTFOUND' || fetchError.code === 'ECONNREFUSED') {
          // Website doesn't exist or is down
          result.error = 'Website not accessible';
          result.isAllowed = false;
        } else if (fetchError.response?.status === 404) {
          // No robots.txt - allowed by default
          result.isAllowed = true;
          result.error = 'No robots.txt found (scraping allowed by default)';
        } else {
          // Other errors - be conservative and disallow
          result.error = `Failed to fetch robots.txt: ${fetchError.message}`;
          result.isAllowed = false;
        }

        return result;
      }

    } catch (error: any) {
      return {
        url,
        robotsUrl: '',
        isAllowed: false,
        userAgent,
        sitemaps: [],
        rules: [],
        error: `Invalid URL: ${error.message}`
      };
    }
  }

  private static parseRobotsRules(content: string): Array<{
    userAgent: string;
    allow: string[];
    disallow: string[];
  }> {
    const rules: Array<{
      userAgent: string;
      allow: string[];
      disallow: string[];
    }> = [];

    const lines = content.split('\n').map(line => line.trim());
    let currentUserAgent = '';
    let currentAllow: string[] = [];
    let currentDisallow: string[] = [];

    for (const line of lines) {
      if (line.startsWith('#') || !line) {
        continue; // Skip comments and empty lines
      }

      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (!directive) continue;

      switch (directive.toLowerCase()) {
        case 'user-agent':
          // Save previous rule if exists
          if (currentUserAgent) {
            rules.push({
              userAgent: currentUserAgent,
              allow: [...currentAllow],
              disallow: [...currentDisallow]
            });
          }
          // Start new rule
          currentUserAgent = value;
          currentAllow = [];
          currentDisallow = [];
          break;

        case 'allow':
          if (currentUserAgent) {
            currentAllow.push(value);
          }
          break;

        case 'disallow':
          if (currentUserAgent) {
            currentDisallow.push(value);
          }
          break;
      }
    }

    // Add the last rule
    if (currentUserAgent) {
      rules.push({
        userAgent: currentUserAgent,
        allow: [...currentAllow],
        disallow: [...currentDisallow]
      });
    }

    return rules;
  }

  static generateComplianceReport(robotsInfo: RobotsInfo): {
    canScrape: boolean;
    recommendations: string[];
    warnings: string[];
  } {
    const recommendations: string[] = [];
    const warnings: string[] = [];

    if (!robotsInfo.isAllowed) {
      warnings.push('🚫 Scraping is not allowed according to robots.txt');
      recommendations.push('Consider contacting the website owner for permission');
      recommendations.push('Use their official API if available');
    } else {
      recommendations.push('✅ Scraping appears to be allowed');
    }

    if (robotsInfo.crawlDelay && robotsInfo.crawlDelay > 0) {
      recommendations.push(`⏱️ Respect crawl delay: ${robotsInfo.crawlDelay} seconds between requests`);
    }

    if (robotsInfo.sitemaps.length > 0) {
      recommendations.push(`🗺️ Consider using sitemap(s): ${robotsInfo.sitemaps.join(', ')}`);
    }

    // Check for common patterns
    const hasWildcardDisallow = robotsInfo.rules.some(rule => 
      rule.disallow.includes('/') && rule.userAgent === '*'
    );

    if (hasWildcardDisallow) {
      warnings.push('⚠️ Website has a blanket disallow rule for all bots');
    }

    return {
      canScrape: robotsInfo.isAllowed,
      recommendations,
      warnings
    };
  }
} 