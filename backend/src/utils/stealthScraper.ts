import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as cheerio from 'cheerio';
// @ts-ignore
import UserAgent from 'user-agents';
import { CookieJar } from 'tough-cookie';
import axios from 'axios';
import { ScrapedContent } from './staticScraper';

export interface StealthScrapeOptions {
  maxRetries?: number;
  timeout?: number;
  userAgent?: string;
  proxy?: string;
  captchaSolver?: 'manual' | '2captcha' | 'anticaptcha' | 'skip';
  captchaApiKey?: string;
  sessionPersistence?: boolean;
  humanBehavior?: boolean;
  stealthLevel?: 'basic' | 'advanced' | 'maximum';
  rateLimitDelay?: number;
  customHeaders?: Record<string, string>;
  viewport?: { width: number; height: number };
}

export interface ScrapingSession {
  cookies: any[];
  userAgent: string;
  fingerprint: BrowserFingerprint;
  lastUsed: Date;
  successCount: number;
  failureCount: number;
  domain: string;
}

export interface BrowserFingerprint {
  userAgent: string;
  viewport: { width: number; height: number };
  timezone: string;
  language: string;
  platform: string;
  webgl: string;
  canvas: string;
}

export interface AntiDetectionResult {
  detected: boolean;
  indicators: string[];
  confidence: number;
  recommendations: string[];
}

export interface CaptchaChallenge {
  type: 'recaptcha' | 'hcaptcha' | 'cloudflare' | 'custom' | 'none';
  siteKey?: string;
  element?: string;
  imageUrl?: string;
}

export class StealthScraper {
  private browser: Browser | null = null;
  private sessions: Map<string, ScrapingSession> = new Map();
  private cookieJar: CookieJar = new CookieJar();
  private rateLimitTracker: Map<string, { count: number; resetTime: number }> = new Map();
  private userAgentPool: string[] = [];
  private proxyPool: string[] = [];

  constructor() {
    this.initializeUserAgentPool();
  }

  private initializeUserAgentPool(): void {
    // Generate realistic user agents
    for (let i = 0; i < 50; i++) {
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      this.userAgentPool.push(userAgent.toString());
    }
  }

  private getRandomUserAgent(): string {
    return this.userAgentPool[Math.floor(Math.random() * this.userAgentPool.length)];
  }

  private generateBrowserFingerprint(): BrowserFingerprint {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 }
    ];

    const timezones = [
      'America/New_York', 'America/Los_Angeles', 'Europe/London', 
      'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'
    ];

    const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'ja-JP'];
    const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];

    return {
      userAgent: this.getRandomUserAgent(),
      viewport: viewports[Math.floor(Math.random() * viewports.length)],
      timezone: timezones[Math.floor(Math.random() * timezones.length)],
      language: languages[Math.floor(Math.random() * languages.length)],
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      webgl: this.generateWebGLFingerprint(),
      canvas: this.generateCanvasFingerprint()
    };
  }

  private generateWebGLFingerprint(): string {
    const vendors = ['Google Inc.', 'Mozilla', 'Apple Inc.'];
    const renderers = [
      'ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
      'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
      'WebKit WebGL'
    ];
    
    return `${vendors[Math.floor(Math.random() * vendors.length)]}~${renderers[Math.floor(Math.random() * renderers.length)]}`;
  }

  private generateCanvasFingerprint(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private async initializeBrowser(options: StealthScrapeOptions): Promise<void> {
    if (this.browser) return;

    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    };

    if (options.proxy) {
      launchOptions.proxy = { server: options.proxy };
    }

    this.browser = await chromium.launch(launchOptions);
  }

  private async createStealthContext(fingerprint: BrowserFingerprint, options: StealthScrapeOptions): Promise<BrowserContext> {
    if (!this.browser) throw new Error('Browser not initialized');

    const context = await this.browser.newContext({
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.language,
      timezoneId: fingerprint.timezone,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': `${fingerprint.language},en;q=0.5`,
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        ...options.customHeaders
      }
    });

    // Apply advanced stealth techniques
    await context.addInitScript(() => {
      // Override navigator properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override permissions
      const originalQuery = (window as any).navigator.permissions.query;
      (window as any).navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: (window as any).Notification.permission }) :
          originalQuery(parameters)
      );

      // Override chrome runtime
      if (!(window as any).chrome) {
        (window as any).chrome = {};
      }
      if (!(window as any).chrome.runtime) {
        (window as any).chrome.runtime = {};
      }

      // Hide automation indicators
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    return context;
  }

  private async detectAntiBot(page: Page): Promise<AntiDetectionResult> {
    const indicators: string[] = [];
    let confidence = 0;

    try {
      // Check for common anti-bot indicators
      const checks = await page.evaluate(() => {
        const results = {
          cloudflare: !!document.querySelector('[data-ray]') || document.title.includes('Cloudflare'),
          recaptcha: !!document.querySelector('.g-recaptcha') || !!document.querySelector('[data-sitekey]'),
          hcaptcha: !!document.querySelector('.h-captcha'),
          distilNetworks: !!document.querySelector('[data-distil-auto-init]'),
          imperva: document.cookie.includes('incap_ses') || document.cookie.includes('visid_incap'),
          akamai: !!document.querySelector('[data-akamai-bm-capabilities]'),
          botDetect: document.title.toLowerCase().includes('bot') || document.title.toLowerCase().includes('blocked'),
          accessDenied: document.body.innerText.toLowerCase().includes('access denied') || 
                       document.body.innerText.toLowerCase().includes('forbidden'),
          rateLimited: document.body.innerText.toLowerCase().includes('rate limit') ||
                      document.body.innerText.toLowerCase().includes('too many requests'),
          jsChallenge: !!document.querySelector('script[src*="challenge"]') || 
                      document.body.innerText.includes('Checking your browser'),
          suspiciousRedirect: window.location.href !== window.location.href
        };
        return results;
      });

      // Analyze results
      if (checks.cloudflare) {
        indicators.push('Cloudflare protection detected');
        confidence += 30;
      }
      if (checks.recaptcha) {
        indicators.push('reCAPTCHA detected');
        confidence += 25;
      }
      if (checks.hcaptcha) {
        indicators.push('hCaptcha detected');
        confidence += 25;
      }
      if (checks.distilNetworks) {
        indicators.push('Distil Networks protection');
        confidence += 20;
      }
      if (checks.imperva) {
        indicators.push('Imperva Incapsula detected');
        confidence += 20;
      }
      if (checks.akamai) {
        indicators.push('Akamai Bot Manager detected');
        confidence += 20;
      }
      if (checks.botDetect) {
        indicators.push('Bot detection in title');
        confidence += 15;
      }
      if (checks.accessDenied) {
        indicators.push('Access denied message');
        confidence += 35;
      }
      if (checks.rateLimited) {
        indicators.push('Rate limiting detected');
        confidence += 30;
      }
      if (checks.jsChallenge) {
        indicators.push('JavaScript challenge detected');
        confidence += 25;
      }

    } catch (error) {
      console.warn('Anti-bot detection failed:', error);
    }

    const recommendations: string[] = [];
    if (confidence > 50) {
      recommendations.push('Use different user agent');
      recommendations.push('Implement longer delays');
      recommendations.push('Try proxy rotation');
      recommendations.push('Consider session reuse');
    }

    return {
      detected: confidence > 30,
      indicators,
      confidence: Math.min(confidence, 100),
      recommendations
    };
  }

  private async detectCaptcha(page: Page): Promise<CaptchaChallenge> {
    try {
      const captchaInfo = await page.evaluate(() => {
        // Check for reCAPTCHA
        const recaptcha = document.querySelector('.g-recaptcha, [data-sitekey]');
        if (recaptcha) {
          return {
            type: 'recaptcha',
            siteKey: recaptcha.getAttribute('data-sitekey'),
            element: '.g-recaptcha'
          };
        }

        // Check for hCaptcha
        const hcaptcha = document.querySelector('.h-captcha');
        if (hcaptcha) {
          return {
            type: 'hcaptcha',
            siteKey: hcaptcha.getAttribute('data-sitekey'),
            element: '.h-captcha'
          };
        }

        // Check for Cloudflare challenge
        if (document.title.includes('Cloudflare') || document.querySelector('[data-ray]')) {
          return {
            type: 'cloudflare',
            element: 'body'
          };
        }

        // Check for custom captcha images
        const captchaImg = document.querySelector('img[src*="captcha"], img[alt*="captcha"]');
        if (captchaImg) {
          return {
            type: 'custom',
            imageUrl: captchaImg.getAttribute('src'),
            element: 'img[src*="captcha"]'
          };
        }

        return { type: 'none' };
      });

      return captchaInfo as CaptchaChallenge;
    } catch (error) {
      console.warn('CAPTCHA detection failed:', error);
      return { type: 'none' };
    }
  }

  private async solveCaptcha(page: Page, captcha: CaptchaChallenge, options: StealthScrapeOptions): Promise<boolean> {
    if (captcha.type === 'none') return true;

    console.log(`🔐 CAPTCHA detected: ${captcha.type}`);

    switch (options.captchaSolver) {
      case 'skip':
        console.log('⏭️ Skipping CAPTCHA as requested');
        return false;

      case 'manual':
        console.log('⏸️ Manual CAPTCHA solving required - waiting 30 seconds');
        await page.waitForTimeout(30000);
        return true;

      case '2captcha':
      case 'anticaptcha':
        if (!options.captchaApiKey) {
          console.warn('⚠️ CAPTCHA API key not provided');
          return false;
        }
        return await this.solveCaptchaWithService(page, captcha, options.captchaSolver, options.captchaApiKey);

      default:
        console.log('⏭️ No CAPTCHA solver configured, skipping');
        return false;
    }
  }

  private async solveCaptchaWithService(page: Page, captcha: CaptchaChallenge, service: string, apiKey: string): Promise<boolean> {
    try {
      console.log(`🔧 Attempting to solve ${captcha.type} with ${service}`);
      
      // This is a placeholder for actual CAPTCHA solving service integration
      // In a real implementation, you would integrate with 2captcha, anticaptcha, etc.
      
      if (captcha.type === 'recaptcha' && captcha.siteKey) {
        // Example integration with 2captcha for reCAPTCHA
        const response = await this.solve2CaptchaRecaptcha(page.url(), captcha.siteKey, apiKey);
        if (response) {
          await page.evaluate((token) => {
            const textarea = document.querySelector('#g-recaptcha-response') as HTMLTextAreaElement;
            if (textarea) {
              textarea.value = token;
              textarea.style.display = 'block';
            }
          }, response);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('CAPTCHA solving failed:', error);
      return false;
    }
  }

  private async solve2CaptchaRecaptcha(pageUrl: string, siteKey: string, apiKey: string): Promise<string | null> {
    try {
      // Submit CAPTCHA to 2captcha
      const submitResponse = await axios.post('http://2captcha.com/in.php', {
        key: apiKey,
        method: 'userrecaptcha',
        googlekey: siteKey,
        pageurl: pageUrl,
        json: 1
      });

      if (submitResponse.data.status !== 1) {
        throw new Error('Failed to submit CAPTCHA');
      }

      const captchaId = submitResponse.data.request;

      // Poll for result
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const resultResponse = await axios.get(`http://2captcha.com/res.php?key=${apiKey}&action=get&id=${captchaId}&json=1`);
        
        if (resultResponse.data.status === 1) {
          return resultResponse.data.request;
        }
      }

      throw new Error('CAPTCHA solving timeout');
    } catch (error) {
      console.error('2captcha error:', error);
      return null;
    }
  }

  private async simulateHumanBehavior(page: Page): Promise<void> {
    try {
      // Random mouse movements
      const viewport = page.viewportSize();
      if (viewport) {
        for (let i = 0; i < 3; i++) {
          const x = Math.random() * viewport.width;
          const y = Math.random() * viewport.height;
          await page.mouse.move(x, y, { steps: 10 });
          await page.waitForTimeout(100 + Math.random() * 200);
        }
      }

      // Random scrolling
      await page.evaluate(() => {
        const scrollHeight = document.body.scrollHeight;
        const viewportHeight = window.innerHeight;
        const scrollSteps = Math.floor(scrollHeight / viewportHeight);
        
        for (let i = 0; i < Math.min(scrollSteps, 5); i++) {
          setTimeout(() => {
            window.scrollTo(0, (i + 1) * viewportHeight * 0.8);
          }, i * 500);
        }
      });

      // Wait with human-like timing
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);

    } catch (error) {
      console.warn('Human behavior simulation failed:', error);
    }
  }

  private async checkRateLimit(domain: string): Promise<boolean> {
    const now = Date.now();
    const tracker = this.rateLimitTracker.get(domain);

    if (!tracker) {
      this.rateLimitTracker.set(domain, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (now > tracker.resetTime) {
      tracker.count = 1;
      tracker.resetTime = now + 60000;
      return true;
    }

    if (tracker.count >= 10) { // Max 10 requests per minute
      const waitTime = tracker.resetTime - now;
      console.log(`⏳ Rate limit reached for ${domain}, waiting ${Math.ceil(waitTime / 1000)}s`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      tracker.count = 1;
      tracker.resetTime = now + 60000;
    } else {
      tracker.count++;
    }

    return true;
  }

  private getOrCreateSession(domain: string): ScrapingSession {
    let session = this.sessions.get(domain);
    
    if (!session || Date.now() - session.lastUsed.getTime() > 3600000) { // 1 hour expiry
      const fingerprint = this.generateBrowserFingerprint();
      session = {
        cookies: [],
        userAgent: fingerprint.userAgent,
        fingerprint,
        lastUsed: new Date(),
        successCount: 0,
        failureCount: 0,
        domain
      };
      this.sessions.set(domain, session);
    }

    session.lastUsed = new Date();
    return session;
  }

  async scrape(url: string, options: StealthScrapeOptions = {}): Promise<{
    content: ScrapedContent;
    session: ScrapingSession;
    antiDetection: AntiDetectionResult;
    captcha: CaptchaChallenge;
    performanceMetrics: any;
  }> {
    const startTime = Date.now();
    const domain = new URL(url).hostname;
    
    // Check rate limiting
    await this.checkRateLimit(domain);
    
    // Get or create session
    const session = this.getOrCreateSession(domain);
    
    // Initialize browser
    await this.initializeBrowser(options);
    
    const maxRetries = options.maxRetries || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🎯 Stealth scraping attempt ${attempt}/${maxRetries} for: ${url}`);
      
      try {
        const context = await this.createStealthContext(session.fingerprint, options);
        
        // Restore cookies
        if (session.cookies.length > 0) {
          await context.addCookies(session.cookies);
        }

        const page = await context.newPage();
        
        // Set additional stealth measures
        await page.setExtraHTTPHeaders({
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': `"${session.fingerprint.platform}"`,
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'none',
          'sec-fetch-user': '?1'
        });

        // Navigate with timeout
        const response = await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: options.timeout || 30000
        });

        if (!response || response.status() >= 400) {
          throw new Error(`HTTP ${response?.status()}: Failed to load page`);
        }

        // Detect anti-bot measures
        const antiDetection = await this.detectAntiBot(page);
        console.log(`🛡️ Anti-bot detection: ${antiDetection.detected ? 'DETECTED' : 'CLEAR'} (confidence: ${antiDetection.confidence}%)`);

        if (antiDetection.detected && antiDetection.confidence > 70) {
          // Apply countermeasures
          console.log('🔧 Applying anti-detection countermeasures...');
          await page.waitForTimeout(2000 + Math.random() * 3000);
          
          if (options.humanBehavior !== false) {
            await this.simulateHumanBehavior(page);
          }
        }

        // Detect and handle CAPTCHA
        const captcha = await this.detectCaptcha(page);
        if (captcha.type !== 'none') {
          const solved = await this.solveCaptcha(page, captcha, options);
          if (!solved && options.captchaSolver !== 'skip') {
            throw new Error(`CAPTCHA challenge failed: ${captcha.type}`);
          }
        }

        // Wait for dynamic content
        await page.waitForTimeout(2000);

        // Extract content
        const html = await page.content();
        const finalUrl = page.url();

        // Save cookies for session persistence
        if (options.sessionPersistence !== false) {
          session.cookies = await context.cookies();
        }

        // Parse content
        const $ = cheerio.load(html);
        const content = this.extractContent($, finalUrl);

        // Performance metrics
        const performanceMetrics = await page.evaluate((startTimeValue) => {
          const navigation = performance.getEntriesByType('navigation')[0] as any;
          return {
            loadTime: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
            domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart || 0,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
            totalTime: Date.now() - startTimeValue
          };
        }, startTime);

        await context.close();

        // Update session stats
        session.successCount++;
        console.log(`✅ Stealth scraping successful in ${Date.now() - startTime}ms`);

        return {
          content: {
            ...content,
            method: 'stealth' as const,
            scrapedAt: new Date()
          },
          session,
          antiDetection,
          captcha,
          performanceMetrics
        };

      } catch (error: any) {
        lastError = error;
        session.failureCount++;
        console.error(`❌ Stealth scraping attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`⏳ Retrying in ${Math.ceil(delay / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Generate new fingerprint for retry
          session.fingerprint = this.generateBrowserFingerprint();
        }
      }
    }

    throw new Error(`Stealth scraping failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  private extractContent($: cheerio.CheerioAPI, url: string): Omit<ScrapedContent, 'method' | 'scrapedAt'> {
    // Enhanced content extraction with better selectors
    const title = $('title').first().text().trim() || 
                 $('h1').first().text().trim() || 
                 $('[data-testid*="title"], [class*="title"], [id*="title"]').first().text().trim() ||
                 'No title found';

    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || '';

    // Comprehensive content selectors for maximum depth extraction
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '[data-testid*="content"]',
      '[class*="content"]',
      '[class*="post"]',
      '[class*="article"]',
      '[class*="story"]',
      '[class*="text"]',
      '[class*="body"]',
      '[class*="description"]',
      '[class*="details"]',
      '[class*="info"]',
      '[class*="summary"]',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.content-body',
      '.main-content',
      '#content',
      '#main',
      '#article',
      '[id*="content"]',
      '[id*="article"]',
      '[id*="post"]',
      'section',
      '.section',
      'div[class*="container"]',
      'div[class*="wrapper"]',
      'body'
    ];

    let content = '';
    let bestContent = '';
    let maxLength = 0;

    // Try all selectors and pick the one with most content
    for (const selector of contentSelectors) {
      const elements = $(selector);
      elements.each((_, element) => {
        const $element = $(element);
        
        // Remove unwanted elements but preserve structure
        const clonedElement = $element.clone();
        clonedElement.find(`
          script, style, nav, footer, aside, header,
          .nav, .navigation, .sidebar, .ad, .advertisement,
          [class*="ad-"], [id*="ad-"], [class*="banner"],
          [class*="popup"], [class*="modal"], [class*="overlay"],
          [class*="cookie"], [class*="gdpr"], [class*="consent"],
          [class*="share"], [class*="social"], [class*="comment"],
          [class*="related"], [class*="recommend"]
        `).remove();
        
        const text = clonedElement.text().replace(/\s+/g, ' ').trim();
        if (text.length > maxLength && text.length > 50) {
          maxLength = text.length;
          bestContent = text;
        }
      });
    }

    content = bestContent;

    // Enhanced fallback content extraction - get everything
    if (!content || content.length < 200) {
      const bodyClone = $('body').clone();
      bodyClone.find(`
        script, style, nav, footer, aside, header,
        .nav, .navigation, .sidebar, .ad, .advertisement,
        [class*="ad-"], [id*="ad-"], [class*="banner"],
        [class*="popup"], [class*="modal"], [class*="overlay"],
        [class*="cookie"], [class*="gdpr"], [class*="consent"]
      `).remove();
      
      content = bodyClone.text().replace(/\s+/g, ' ').trim();
    }

    // Extract all links comprehensively
    const links = $('a[href]').map((_, el) => {
      const $link = $(el);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (!href) return null;

      try {
        const linkUrl = new URL(href, url);
        const parsedUrl = new URL(url);
        return {
          text: text || href,
          href: linkUrl.href,
          internal: linkUrl.hostname === parsedUrl.hostname
        };
      } catch {
        return null;
      }
    }).get().filter(Boolean);

    // Extract all images and media comprehensively
    const images = $('img[src], img[data-src], img[data-lazy-src], picture source[srcset], video[poster]').map((_, el) => {
      const $img = $(el);
      const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || $img.attr('srcset') || $img.attr('poster');
      const alt = $img.attr('alt') || $img.attr('title') || '';
      
      if (!src) return null;

      try {
        const imageUrl = new URL(src.split(' ')[0], url); // Handle srcset
        return {
          src: imageUrl.href,
          alt: alt.trim()
        };
      } catch {
        return null;
      }
    }).get().filter(Boolean);

    // Extract headings for better structure understanding
    const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => {
      const $heading = $(el);
      const text = $heading.text().trim();
      const level = parseInt(el.tagName.charAt(1));
      
      if (!text) return null;
      
      return {
        level,
        text,
        id: $heading.attr('id') || ''
      };
    }).get().filter(Boolean);

    // Extract metadata comprehensively
    const metadata: any = {
      metaDescription: description,
      title: title,
      url: url
    };

    // Extract all meta tags
    $('meta').each((_, el) => {
      const $meta = $(el);
      const name = $meta.attr('name') || $meta.attr('property') || $meta.attr('http-equiv');
      const content = $meta.attr('content');
      
      if (name && content) {
        metadata[name] = content;
      }
    });

    // Extract structured data (JSON-LD, microdata)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonData = JSON.parse($(el).html() || '');
        metadata.structuredData = metadata.structuredData || [];
        metadata.structuredData.push(jsonData);
      } catch {
        // Ignore invalid JSON
      }
    });

    return {
      url,
      title,
      content,
      description,
      links: links, // No artificial limits - get everything
      images: images, // No artificial limits - get everything
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      metadata,
      headings
    };
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.sessions.clear();
    this.rateLimitTracker.clear();
  }

  // Session management methods
  getSessionStats(domain: string): ScrapingSession | null {
    return this.sessions.get(domain) || null;
  }

  clearSession(domain: string): void {
    this.sessions.delete(domain);
  }

  clearAllSessions(): void {
    this.sessions.clear();
  }
} 