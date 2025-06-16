import axios from 'axios';
import { URL } from 'url';

export interface ApiEndpoint {
  url: string;
  method: string;
  contentType: string;
  responseSize: number;
  isJson: boolean;
  isApi: boolean;
  confidence: number;
}

export interface ApiScrapedData {
  endpoints: ApiEndpoint[];
  extractedData: any[];
  structuredContent: {
    articles?: any[];
    products?: any[];
    listings?: any[];
    comments?: any[];
    metadata?: any;
  };
  totalDataPoints: number;
}

export class ApiScraper {
  private static API_INDICATORS = [
    '/api/',
    '/v1/',
    '/v2/',
    '/v3/',
    '/graphql',
    '/rest/',
    '/json',
    '.json',
    '/data/',
    '/feed/',
    '/ajax/',
    '/xhr/'
  ];

  private static CONTENT_PATTERNS = {
    articles: ['title', 'content', 'body', 'text', 'article', 'post'],
    products: ['name', 'price', 'description', 'product', 'item', 'sku'],
    listings: ['listing', 'property', 'job', 'event', 'location'],
    comments: ['comment', 'review', 'feedback', 'message', 'reply'],
    users: ['user', 'author', 'profile', 'member', 'account'],
    media: ['image', 'video', 'photo', 'media', 'gallery']
  };

  static analyzeNetworkRequests(requests: any[]): ApiEndpoint[] {
    return requests
      .filter(req => req.response && req.response.status < 400)
      .map(req => this.analyzeRequest(req))
      .filter(endpoint => endpoint.isApi)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private static analyzeRequest(request: any): ApiEndpoint {
    const url = request.url;
    const method = request.method;
    const contentType = request.response?.contentType || '';
    const responseSize = request.response?.size || 0;
    
    let confidence = 0;
    let isJson = false;
    let isApi = false;

    // Check content type
    if (contentType.includes('application/json')) {
      isJson = true;
      confidence += 40;
    } else if (contentType.includes('text/json')) {
      isJson = true;
      confidence += 30;
    }

    // Check URL patterns
    const urlLower = url.toLowerCase();
    for (const indicator of this.API_INDICATORS) {
      if (urlLower.includes(indicator)) {
        isApi = true;
        confidence += 25;
        break;
      }
    }

    // Check method
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      confidence += 10;
    }

    // Check response size (APIs usually return substantial data)
    if (responseSize > 1000) {
      confidence += 15;
    }

    // Check for common API query parameters
    if (url.includes('?') && (url.includes('limit=') || url.includes('offset=') || 
        url.includes('page=') || url.includes('sort=') || url.includes('filter='))) {
      confidence += 20;
    }

    isApi = isApi || (isJson && confidence > 30);

    return {
      url,
      method,
      contentType,
      responseSize,
      isJson,
      isApi,
      confidence: Math.min(confidence, 100)
    };
  }

  static async scrapeApiEndpoints(endpoints: ApiEndpoint[], originalUrl: string): Promise<ApiScrapedData> {
    const extractedData: any[] = [];
    const structuredContent: any = {
      articles: [],
      products: [],
      listings: [],
      comments: [],
      metadata: {}
    };

    for (const endpoint of endpoints.slice(0, 5)) { // Limit to top 5 endpoints
      try {
        const data = await this.fetchApiData(endpoint, originalUrl);
        if (data) {
          extractedData.push({
            endpoint: endpoint.url,
            data,
            timestamp: new Date().toISOString()
          });

          // Categorize and structure the data
          this.categorizeData(data, structuredContent);
        }
      } catch (error) {
        console.warn(`Failed to fetch API endpoint ${endpoint.url}:`, error);
      }
    }

    return {
      endpoints,
      extractedData,
      structuredContent,
      totalDataPoints: extractedData.reduce((sum, item) => sum + this.countDataPoints(item.data), 0)
    };
  }

  private static async fetchApiData(endpoint: ApiEndpoint, originalUrl: string): Promise<any> {
    try {
      const headers: any = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': originalUrl
      };

      // Add common API headers
      if (endpoint.url.includes('graphql')) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await axios.get(endpoint.url, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status >= 400) {
        return null;
      }

      return response.data;
    } catch (error) {
      return null;
    }
  }

  private static categorizeData(data: any, structuredContent: any): void {
    if (!data || typeof data !== 'object') return;

    // Handle arrays
    if (Array.isArray(data)) {
      data.forEach(item => this.categorizeData(item, structuredContent));
      return;
    }

    // Analyze object structure to determine category
    const keys = Object.keys(data).map(k => k.toLowerCase());
    const content = JSON.stringify(data).toLowerCase();

    // Check for articles/posts
    if (this.matchesPattern(keys, content, this.CONTENT_PATTERNS.articles)) {
      structuredContent.articles.push(data);
    }
    // Check for products
    else if (this.matchesPattern(keys, content, this.CONTENT_PATTERNS.products)) {
      structuredContent.products.push(data);
    }
    // Check for listings
    else if (this.matchesPattern(keys, content, this.CONTENT_PATTERNS.listings)) {
      structuredContent.listings.push(data);
    }
    // Check for comments
    else if (this.matchesPattern(keys, content, this.CONTENT_PATTERNS.comments)) {
      structuredContent.comments.push(data);
    }
    // Store as general metadata
    else {
      Object.assign(structuredContent.metadata, data);
    }

    // Recursively process nested objects
    Object.values(data).forEach(value => {
      if (typeof value === 'object' && value !== null) {
        this.categorizeData(value, structuredContent);
      }
    });
  }

  private static matchesPattern(keys: string[], content: string, patterns: string[]): boolean {
    const matches = patterns.filter(pattern => 
      keys.some(key => key.includes(pattern)) || content.includes(pattern)
    );
    return matches.length >= 2; // Require at least 2 pattern matches
  }

  private static countDataPoints(data: any): number {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'object') return Object.keys(data).length;
    return 1;
  }

  // Extract structured data from common API response formats
  static extractStructuredData(apiData: any): {
    title?: string;
    description?: string;
    content?: string;
    items?: any[];
    metadata?: any;
  } {
    if (!apiData || typeof apiData !== 'object') return {};

    const result: any = {};

    // Common API response patterns
    if (apiData.data) {
      return this.extractStructuredData(apiData.data);
    }

    if (apiData.results) {
      result.items = Array.isArray(apiData.results) ? apiData.results : [apiData.results];
    }

    if (apiData.items) {
      result.items = Array.isArray(apiData.items) ? apiData.items : [apiData.items];
    }

    // Extract title from various fields
    result.title = apiData.title || apiData.name || apiData.headline || apiData.subject;

    // Extract description
    result.description = apiData.description || apiData.summary || apiData.excerpt || apiData.intro;

    // Extract content
    result.content = apiData.content || apiData.body || apiData.text || apiData.message;

    // Store remaining metadata
    result.metadata = { ...apiData };
    delete result.metadata.data;
    delete result.metadata.results;
    delete result.metadata.items;

    return result;
  }
}

export default ApiScraper; 