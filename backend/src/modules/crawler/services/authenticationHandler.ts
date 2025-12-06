import { Page } from 'playwright';
import { URL } from 'url';

export interface AuthConfig {
  type: 'none' | 'basic' | 'form' | 'bearer' | 'cookie';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    cookies?: { [key: string]: string };
    loginUrl?: string;
    usernameField?: string;
    passwordField?: string;
    submitSelector?: string;
    successIndicator?: string;
  };
}

export interface AuthResult {
  success: boolean;
  error?: string;
  sessionData?: any;
  cookies?: any[];
}

export class AuthenticationHandler {
  private authSessions: Map<string, any> = new Map();

  /**
   * Authenticate page based on configuration
   */
  async authenticatePage(page: Page, authConfig: AuthConfig, domain: string): Promise<AuthResult> {
    if (!authConfig || authConfig.type === 'none') {
      return { success: true };
    }

    try {
      switch (authConfig.type) {
        case 'basic':
          return await this.handleBasicAuth(page, authConfig);
        case 'form':
          return await this.handleFormAuth(page, authConfig, domain);
        case 'bearer':
          return await this.handleBearerAuth(page, authConfig);
        case 'cookie':
          return await this.handleCookieAuth(page, authConfig);
        default:
          throw new Error(`Unsupported authentication type: ${authConfig.type}`);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown authentication error' 
      };
    }
  }

  /**
   * Handle Basic Authentication
   */
  private async handleBasicAuth(page: Page, authConfig: AuthConfig): Promise<AuthResult> {
    const { username, password } = authConfig.credentials || {};
    
    if (!username || !password) {
      throw new Error('Username and password required for basic authentication');
    }

    // Set basic auth header
    await page.setExtraHTTPHeaders({
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    });

    return { success: true };
  }

  /**
   * Handle Form-based Authentication
   */
  private async handleFormAuth(page: Page, authConfig: AuthConfig, domain: string): Promise<AuthResult> {
    const { 
      username, 
      password, 
      loginUrl, 
      usernameField = 'username',
      passwordField = 'password',
      submitSelector = 'input[type="submit"], button[type="submit"]',
      successIndicator
    } = authConfig.credentials || {};

    if (!username || !password || !loginUrl) {
      throw new Error('Username, password, and loginUrl required for form authentication');
    }

    // Navigate to login page
    console.log(`🔐 Navigating to login page: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'networkidle' });

    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check if there are any iframes that might contain the login form
    const frames = page.frames();
    console.log(`🎭 Found ${frames.length} frames on page`);
    
    // Log current page title and URL for debugging
    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`📄 Page: "${pageTitle}" at ${currentUrl}`);

    // Check if this is a modal-based login - look for login triggers
    const loginTriggers = [
      'button:has-text("Login")', 'button:has-text("Sign in")', 'a:has-text("Login")', 
      'a:has-text("Sign in")', '[class*="login"]', '[id*="login"]',
      'button:has-text("Sign In")', 'a:has-text("Sign In")',
      // Additional triggers
      'button:has-text("Log in")', 'a:has-text("Log in")',
      '.login-btn', '.signin-btn', '.auth-btn',
      '[data-toggle="modal"]', '[data-bs-toggle="modal"]',
      // Generic login buttons
      'button[class*="login" i]', 'a[class*="login" i]',
      'button[id*="login" i]', 'a[id*="login" i]'
    ];

    let modalTriggered = false;
    for (const trigger of loginTriggers) {
      try {
        const element = await page.$(trigger);
        if (element) {
          console.log(`🔗 Found login trigger: ${trigger}`);
          
          // Check if element is visible before clicking
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click();
            await page.waitForTimeout(1500);
            modalTriggered = true;
            break;
          }
        }
      } catch (e) {
        // Continue trying other triggers
      }
    }

    if (modalTriggered) {
      console.log(`✅ Login modal triggered, waiting for form...`);
      
      // Wait for modal to appear with multiple strategies
      const modalSelectors = [
        '.modal', '[role="dialog"]', '.popup', '.overlay',
        '.login-modal', '.auth-modal', '.signin-modal'
      ];
      
      let modalFound = false;
      for (const selector of modalSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`📋 Modal found: ${selector}`);
          modalFound = true;
          break;
        } catch (e) {
          // Continue
        }
      }
      
      if (!modalFound) {
        console.log(`⚠️ Modal not detected, but login trigger was clicked`);
      }
      
      await page.waitForTimeout(2000);
    }

    // Fill username field - with comprehensive selectors
    const usernameSelectors = [
      usernameField, // Use the provided selector first
      `input[name="${usernameField}"]`,
      `input[id="${usernameField}"]`,
      'input[type="email"]',
      'input[type="text"]', // Added generic text input
      'input[name="email"]',
      'input[name="login"]',
      'input[name="user"]',
      'input[name="username"]',
      'input[name="userid"]',
      'input[name="user_id"]',
      'input[name="loginid"]',
      'input[name="account"]',
      'input[placeholder*="username" i]',
      'input[placeholder*="email" i]',
      'input[placeholder*="user" i]',
      'input[placeholder*="login" i]',
      'input[aria-label*="username" i]',
      'input[aria-label*="email" i]',
      'input[aria-label*="user" i]',
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
      // Look for any input that's the first in a form
      'form input[type="text"]:first-of-type',
      'form input:not([type="password"]):not([type="submit"]):not([type="button"]):not([type="hidden"]):first-of-type',
      // Modal-specific selectors
      '.modal input[type="text"]',
      '.modal input[type="email"]',
      '[role="dialog"] input[type="text"]',
      '[role="dialog"] input[type="email"]'
    ];

    let usernameElement = null;
    console.log(`🔍 Searching for username field with ${usernameSelectors.length} selectors...`);
    
    for (const selector of usernameSelectors) {
      try {
        usernameElement = await page.$(selector);
        if (usernameElement) {
          console.log(`✅ Username field found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!usernameElement) {
      console.log(`❌ No username field found. Available inputs on page:`);
      try {
        const allInputs = await page.$$eval('input', inputs => 
          inputs.map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            className: input.className,
            visible: !input.hidden && input.offsetParent !== null
          }))
        );
        console.log(JSON.stringify(allInputs, null, 2));
      } catch (e) {
        console.log(`Could not analyze page inputs`);
      }
      // Take screenshot for debugging
      try {
        await page.screenshot({ path: `debug-auth-${domain}-${Date.now()}.png`, fullPage: true });
        console.log(`📸 Screenshot saved for debugging`);
      } catch (e) {
        // Ignore screenshot errors
      }
      
      throw new Error('Could not find username field');
    }

    await usernameElement.fill(username);
    console.log(`✅ Username field filled`);

    // Fill password field
    const passwordSelectors = [
      passwordField, // Use the provided selector first
      `input[name="${passwordField}"]`,
      `input[id="${passwordField}"]`,
      'input[type="password"]',
      'input[name="pass"]',
      'input[name="password"]',
      'input[name="pwd"]',
      'input[name="passwd"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="pass" i]',
      'input[aria-label*="password" i]',
      'input[autocomplete="current-password"]',
      'input[autocomplete="password"]',
      // Modal-specific selectors
      '.modal input[type="password"]',
      '[role="dialog"] input[type="password"]'
    ];

    let passwordElement = null;
    console.log(`🔍 Searching for password field with ${passwordSelectors.length} selectors...`);
    
    for (const selector of passwordSelectors) {
      try {
        passwordElement = await page.$(selector);
        if (passwordElement) {
          console.log(`✅ Password field found with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!passwordElement) {
      console.log(`❌ No password field found`);
      throw new Error('Could not find password field');
    }

    await passwordElement.fill(password);
    console.log(`✅ Password field filled`);

    // Submit form - try multiple approaches
    const submitSelectors = [
      submitSelector,
      'button:has-text("Sign in")',
      'button:has-text("Sign In")', 
      'button:has-text("Login")',
      'input[type="submit"]',
      'button[type="submit"]',
      '.btn-primary',
      '.login-btn'
    ];

    let submitClicked = false;
    for (const selector of submitSelectors) {
      try {
        const submitButton = await page.$(selector);
        if (submitButton) {
          console.log(`🎯 Found submit button: ${selector}`);
          await submitButton.click();
          submitClicked = true;
          break;
        }
      } catch (e) {
        // Continue trying other selectors
      }
    }

    if (!submitClicked) {
      console.log(`⌨️ No submit button found, trying Enter key`);
      await page.keyboard.press('Enter');
    }

    console.log(`🚀 Login form submitted`);

    // Wait for navigation/response
    await page.waitForTimeout(3000);

    // Check for successful login
    let isAuthenticated = true;
    if (successIndicator) {
      try {
        await page.waitForSelector(successIndicator, { timeout: 5000 });
        console.log(`✅ Success indicator found: ${successIndicator}`);
      } catch (e) {
        isAuthenticated = false;
        console.log(`❌ Success indicator not found: ${successIndicator}`);
      }
    } else {
      // Check for common error indicators
      const errorSelectors = [
        '.error', '.alert-danger', '.login-error', 
        '[class*="error"]', '[class*="invalid"]'
      ];
      
      for (const errorSelector of errorSelectors) {
        const errorElement = await page.$(errorSelector);
        if (errorElement) {
          const errorText = await errorElement.textContent();
          if (errorText && errorText.trim()) {
            isAuthenticated = false;
            throw new Error(`Login failed: ${errorText.trim()}`);
          }
        }
      }
    }

    if (isAuthenticated) {
      // Store session cookies
      const cookies = await page.context().cookies();
      this.authSessions.set(domain, {
        cookies,
        authenticated: true,
        authenticatedAt: new Date()
      });

      console.log(`✅ Authentication successful for ${domain}`);
      return { 
        success: true, 
        sessionData: { domain, authenticatedAt: new Date() },
        cookies 
      };
    } else {
      throw new Error('Login appears to have failed');
    }
  }

  /**
   * Handle Bearer Token Authentication
   */
  private async handleBearerAuth(page: Page, authConfig: AuthConfig): Promise<AuthResult> {
    const { token } = authConfig.credentials || {};
    
    if (!token) {
      throw new Error('Token required for bearer authentication');
    }

    // Set bearer token header
    await page.setExtraHTTPHeaders({
      'Authorization': `Bearer ${token}`
    });

    return { success: true };
  }

  /**
   * Handle Cookie-based Authentication
   */
  private async handleCookieAuth(page: Page, authConfig: AuthConfig): Promise<AuthResult> {
    const { cookies } = authConfig.credentials || {};
    
    if (!cookies || Object.keys(cookies).length === 0) {
      throw new Error('Cookies required for cookie authentication');
    }

    // Set cookies
    const cookieArray = Object.entries(cookies).map(([name, value]) => ({
      name,
      value,
      domain: new URL(page.url()).hostname,
      path: '/'
    }));

    await page.context().addCookies(cookieArray);

    return { success: true };
  }

  /**
   * Check if domain is authenticated
   */
  isAuthenticated(domain: string): boolean {
    const session = this.authSessions.get(domain);
    return session && session.authenticated;
  }

  /**
   * Get stored session for domain
   */
  getSession(domain: string): any {
    return this.authSessions.get(domain);
  }

  /**
   * Clear authentication session
   */
  clearSession(domain: string): void {
    this.authSessions.delete(domain);
  }

  /**
   * Apply stored authentication to page
   */
  async applyStoredAuth(page: Page, domain: string): Promise<boolean> {
    const session = this.authSessions.get(domain);
    if (!session || !session.authenticated) {
      return false;
    }

    try {
      // Apply stored cookies
      if (session.cookies && session.cookies.length > 0) {
        await page.context().addCookies(session.cookies);
      }
      return true;
    } catch (error) {
      console.error(`Failed to apply stored auth for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Validate authentication is still valid
   */
  async validateAuth(page: Page, domain: string, testUrl?: string): Promise<boolean> {
    const session = this.authSessions.get(domain);
    if (!session || !session.authenticated) {
      return false;
    }

    try {
      // Test with a known protected URL or current page
      const testPageUrl = testUrl || page.url();
      await page.goto(testPageUrl);
      
      // Check for login redirects or auth errors
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('login') || 
                                 currentUrl.includes('signin') || 
                                 currentUrl.includes('auth');
      
      if (isRedirectedToLogin) {
        console.log(`🔄 Auth expired for ${domain}, redirected to login`);
        this.clearSession(domain);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Auth validation failed for ${domain}:`, error);
      return false;
    }
  }

  /**
   * Test authentication process independently for debugging
   */
  async testAuthentication(authConfig: AuthConfig, testUrl: string): Promise<AuthResult> {
    const { chromium } = require('playwright');
    
    console.log(`🧪 Testing authentication for ${testUrl}`);
    
    const browser = await chromium.launch({ headless: false }); // Run in visible mode for debugging
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      const result = await this.authenticatePage(page, authConfig, new URL(testUrl).hostname);
      
      if (result.success) {
        console.log(`✅ Authentication test successful`);
        
        // Try to navigate to a page that might require authentication
        await page.goto(testUrl);
        await page.waitForTimeout(3000);
        
        const finalUrl = page.url();
        const finalTitle = await page.title();
        console.log(`🎯 Final page: "${finalTitle}" at ${finalUrl}`);
        
        // Take a screenshot of the final state
        await page.screenshot({ path: `auth-test-success-${Date.now()}.png` });
        console.log(`📸 Success screenshot saved`);
      } else {
        console.log(`❌ Authentication test failed: ${result.error}`);
        
        // Take a screenshot of the failure state
        await page.screenshot({ path: `auth-test-failure-${Date.now()}.png` });
        console.log(`📸 Failure screenshot saved`);
      }
      
      await browser.close();
      return result;
      
    } catch (error) {
      console.error(`🚨 Authentication test error:`, error);
      
      try {
        await page.screenshot({ path: `auth-test-error-${Date.now()}.png` });
        console.log(`📸 Error screenshot saved`);
      } catch (e) {
        // Ignore screenshot errors
      }
      
      await browser.close();
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown test error' 
      };
    }
  }
} 