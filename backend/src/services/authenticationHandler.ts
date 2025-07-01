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

    // Check if this is a modal-based login - look for login triggers
    const loginTriggers = [
      'button:has-text("Login")', 'button:has-text("Sign in")', 'a:has-text("Login")', 
      'a:has-text("Sign in")', '[class*="login"]', '[id*="login"]',
      'button:has-text("Sign In")', 'a:has-text("Sign In")'
    ];

    let modalTriggered = false;
    for (const trigger of loginTriggers) {
      try {
        const element = await page.$(trigger);
        if (element) {
          console.log(`🔗 Found login trigger: ${trigger}`);
          await element.click();
          await page.waitForTimeout(1000);
          modalTriggered = true;
          break;
        }
      } catch (e) {
        // Continue trying other triggers
      }
    }

    if (modalTriggered) {
      console.log(`✅ Login modal triggered, waiting for form...`);
      await page.waitForTimeout(2000);
    }

    // Fill username field
    const usernameSelectors = [
      usernameField, // Use the provided selector first
      `input[name="${usernameField}"]`,
      `input[id="${usernameField}"]`,
      'input[type="email"]',
      'input[name="email"]',
      'input[name="login"]',
      'input[name="user"]',
      'input[name="username"]',
      'input[placeholder*="username" i]',
      'input[placeholder*="email" i]'
    ];

    let usernameElement = null;
    for (const selector of usernameSelectors) {
      try {
        usernameElement = await page.$(selector);
        if (usernameElement) break;
      } catch (e) {
        continue;
      }
    }

    if (!usernameElement) {
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
      'input[placeholder*="password" i]'
    ];

    let passwordElement = null;
    for (const selector of passwordSelectors) {
      try {
        passwordElement = await page.$(selector);
        if (passwordElement) break;
      } catch (e) {
        continue;
      }
    }

    if (!passwordElement) {
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
} 