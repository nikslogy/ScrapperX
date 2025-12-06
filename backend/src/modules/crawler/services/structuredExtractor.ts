import * as cheerio from 'cheerio';
import { IRawContent } from '../../../models/crawlerModels';

export interface ExtractionSchema {
  name: string;
  version: string;
  fields: {
    [key: string]: {
      type: 'text' | 'number' | 'date' | 'url' | 'email' | 'phone' | 'currency' | 'array' | 'object';
      selector?: string;
      attribute?: string;
      required?: boolean;
      multiple?: boolean;
      nested?: ExtractionSchema;
    };
  };
}

export interface ExtractionResult {
  schema: string;
  version: string;
  fields: { [key: string]: any };
  nestedStructures: any[];
  qualityScore: number;
  extractionMethod: 'pattern' | 'selector' | 'heuristic';
  extractedAt: Date;
}

export class StructuredExtractor {
  private defaultSchemas: Map<string, ExtractionSchema> = new Map();

  constructor() {
    this.initializeDefaultSchemas();
  }

  /**
   * Initialize common extraction schemas
   */
  private initializeDefaultSchemas(): void {
    // Product schema
    this.defaultSchemas.set('product', {
      name: 'product',
      version: '1.0',
      fields: {
        title: { type: 'text', selector: 'h1, .product-title, [data-product-name]', required: true },
        price: { type: 'currency', selector: '.price, .product-price, [data-price]' },
        description: { type: 'text', selector: '.description, .product-description' },
        image: { type: 'url', selector: 'img.product-image, .product-img img', attribute: 'src' },
        rating: { type: 'number', selector: '.rating, .stars' },
        availability: { type: 'text', selector: '.stock, .availability' },
        sku: { type: 'text', selector: '.sku, [data-sku]' },
        brand: { type: 'text', selector: '.brand, .manufacturer' },
        category: { type: 'text', selector: '.breadcrumb, .category' }
      }
    });

    // Article schema
    this.defaultSchemas.set('article', {
      name: 'article',
      version: '1.0',
      fields: {
        title: { type: 'text', selector: 'h1, .article-title, .post-title', required: true },
        author: { type: 'text', selector: '.author, .byline, [rel="author"]' },
        publishDate: { type: 'date', selector: '.date, .publish-date, time', attribute: 'datetime' },
        content: { type: 'text', selector: '.article-content, .post-content, .entry-content' },
        excerpt: { type: 'text', selector: '.excerpt, .summary' },
        tags: { type: 'array', selector: '.tags a, .tag', multiple: true },
        category: { type: 'text', selector: '.category, .section' },
        readTime: { type: 'text', selector: '.read-time, .reading-time' }
      }
    });

    // Contact schema
    this.defaultSchemas.set('contact', {
      name: 'contact',
      version: '1.0',
      fields: {
        name: { type: 'text', selector: '.name, .contact-name, h1' },
        email: { type: 'email', selector: 'a[href^="mailto:"], .email' },
        phone: { type: 'phone', selector: 'a[href^="tel:"], .phone' },
        address: { type: 'text', selector: '.address, .location' },
        website: { type: 'url', selector: 'a[href^="http"], .website' },
        description: { type: 'text', selector: '.description, .bio' },
        socialMedia: { type: 'array', selector: 'a[href*="facebook"], a[href*="twitter"], a[href*="linkedin"]', multiple: true }
      }
    });

    // Event schema
    this.defaultSchemas.set('event', {
      name: 'event',
      version: '1.0',
      fields: {
        title: { type: 'text', selector: 'h1, .event-title', required: true },
        date: { type: 'date', selector: '.date, .event-date, time' },
        location: { type: 'text', selector: '.location, .venue' },
        description: { type: 'text', selector: '.description, .event-description' },
        price: { type: 'currency', selector: '.price, .ticket-price' },
        organizer: { type: 'text', selector: '.organizer, .host' }
      }
    });

    // Job listing schema
    this.defaultSchemas.set('job', {
      name: 'job',
      version: '1.0',
      fields: {
        title: { type: 'text', selector: 'h1, .job-title', required: true },
        company: { type: 'text', selector: '.company, .employer' },
        location: { type: 'text', selector: '.location, .job-location' },
        description: { type: 'text', selector: '.description, .job-description' },
        salary: { type: 'currency', selector: '.salary, .pay' },
        employmentType: { type: 'text', selector: '.employment-type, .job-type' },
        postDate: { type: 'date', selector: '.post-date, .posted' },
        requirements: { type: 'text', selector: '.requirements, .qualifications' }
      }
    });
  }

  /**
   * Extract structured data from content
   */
  async extractStructuredData(
    content: IRawContent,
    customSchema?: ExtractionSchema
  ): Promise<ExtractionResult> {
    const $ = cheerio.load(content.htmlContent);
    
    // Determine schema to use
    let schema: ExtractionSchema;
    let method: 'pattern' | 'selector' | 'heuristic' = 'heuristic';

    if (customSchema) {
      schema = customSchema;
      method = 'selector';
    } else {
      // Auto-detect schema based on content
      schema = this.detectSchema($, content);
      method = 'heuristic';
    }

    // Extract data using schema
    const extractedFields = this.extractFields($, schema);
    
    // Extract nested structures
    const nestedStructures = this.extractNestedStructures($, schema);
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(extractedFields, schema);

    return {
      schema: schema.name,
      version: schema.version,
      fields: extractedFields,
      nestedStructures,
      qualityScore,
      extractionMethod: method,
      extractedAt: new Date()
    };
  }

  /**
   * Extract fields using schema
   */
  private extractFields($: cheerio.CheerioAPI, schema: ExtractionSchema): { [key: string]: any } {
    const extracted: { [key: string]: any } = {};

    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      try {
        let value = null;

        if (fieldDef.selector) {
          const elements = $(fieldDef.selector);
          
          if (fieldDef.multiple) {
            value = [];
            elements.each((i, el) => {
              const extractedValue = this.extractValue($, $(el), fieldDef);
              if (extractedValue) {
                value.push(extractedValue);
              }
            });
          } else if (elements.length > 0) {
            value = this.extractValue($, elements.first(), fieldDef);
          }
        }

        // Apply type conversion and validation
        value = this.convertAndValidateValue(value, fieldDef.type);

        if (value !== null || fieldDef.required) {
          extracted[fieldName] = value;
        }

      } catch (error) {
        console.warn(`Failed to extract field ${fieldName}:`, error);
        if (fieldDef.required) {
          extracted[fieldName] = null;
        }
      }
    }

    return extracted;
  }

  /**
   * Extract value from element
   */
  private extractValue($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>, fieldDef: any): any {
    if (fieldDef.attribute) {
      return element.attr(fieldDef.attribute);
    } else {
      return element.text().trim();
    }
  }

  /**
   * Convert and validate value based on type
   */
  private convertAndValidateValue(value: any, type: string): any {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    switch (type) {
      case 'number':
        const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? null : num;

      case 'currency':
        const currency = String(value).replace(/[^0-9.,]/g, '');
        const parsed = parseFloat(currency.replace(',', ''));
        return isNaN(parsed) ? null : parsed;

      case 'date':
        try {
          const date = new Date(String(value));
          return isNaN(date.getTime()) ? null : date.toISOString();
        } catch {
          return null;
        }

      case 'url':
        try {
          const url = new URL(String(value));
          return url.href;
        } catch {
          // Try relative URL
          if (String(value).startsWith('/') || String(value).startsWith('./')) {
            return String(value);
          }
          return null;
        }

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const email = String(value).toLowerCase().trim();
        return emailRegex.test(email) ? email : null;

      case 'phone':
        const phone = String(value).replace(/[^0-9+()-\s]/g, '');
        return phone.length >= 10 ? phone : null;

      case 'array':
        return Array.isArray(value) ? value : [value];

      case 'text':
      default:
        return String(value).trim();
    }
  }

  /**
   * Extract nested structures
   */
  private extractNestedStructures($: cheerio.CheerioAPI, schema: ExtractionSchema): any[] {
    const nestedStructures: any[] = [];

    // Look for common nested patterns
    const listSelectors = [
      '.list-item', '.item', '.card', '.product-item',
      'li', '.row', '.entry', '.post'
    ];

    for (const selector of listSelectors) {
      const items = $(selector);
      if (items.length > 1) {
        const structures: any[] = [];
        
        items.each((i, el) => {
          const itemData = this.extractItemData($, $(el));
          if (Object.keys(itemData).length > 0) {
            structures.push(itemData);
          }
        });

        if (structures.length > 0) {
          nestedStructures.push({
            type: 'list',
            selector: selector,
            count: structures.length,
            items: structures.slice(0, 10) // Limit to first 10 items for efficiency
          });
        }
      }
    }

    return nestedStructures;
  }

  /**
   * Extract data from individual item
   */
  private extractItemData($: cheerio.CheerioAPI, element: cheerio.Cheerio<any>): any {
    const data: any = {};

    // Common patterns for titles
    const titleSelectors = ['h1', 'h2', 'h3', '.title', '.name', 'a'];
    for (const selector of titleSelectors) {
      const titleEl = element.find(selector).first();
      if (titleEl.length) {
        data.title = titleEl.text().trim();
        break;
      }
    }

    // Common patterns for links
    const linkEl = element.find('a').first();
    if (linkEl.length) {
      data.link = linkEl.attr('href');
    }

    // Common patterns for images
    const imgEl = element.find('img').first();
    if (imgEl.length) {
      data.image = imgEl.attr('src');
    }

    // Common patterns for prices
    const priceSelectors = ['.price', '.cost', '.amount', '[class*="price"]'];
    for (const selector of priceSelectors) {
      const priceEl = element.find(selector).first();
      if (priceEl.length) {
        data.price = this.convertAndValidateValue(priceEl.text(), 'currency');
        break;
      }
    }

    return data;
  }

  /**
   * Auto-detect schema based on content analysis
   */
  private detectSchema($: cheerio.CheerioAPI, content: IRawContent): ExtractionSchema {
    const text = content.textContent.toLowerCase();
    const html = content.htmlContent.toLowerCase();

    // Product indicators
    if (this.hasProductIndicators($, text, html)) {
      return this.defaultSchemas.get('product')!;
    }

    // Article indicators
    if (this.hasArticleIndicators($, text, html)) {
      return this.defaultSchemas.get('article')!;
    }

    // Contact indicators
    if (this.hasContactIndicators($, text, html)) {
      return this.defaultSchemas.get('contact')!;
    }

    // Event indicators
    if (this.hasEventIndicators($, text, html)) {
      return this.defaultSchemas.get('event')!;
    }

    // Job indicators
    if (this.hasJobIndicators($, text, html)) {
      return this.defaultSchemas.get('job')!;
    }

    // Default to generic content schema
    return this.createGenericSchema($);
  }

  /**
   * Check for product indicators
   */
  private hasProductIndicators($: cheerio.CheerioAPI, text: string, html: string): boolean {
    const productWords = ['price', 'buy', 'cart', 'purchase', 'product', 'sku', 'inventory'];
    const productSelectors = ['.price', '.add-to-cart', '.buy-now', '.product'];
    
    const hasWords = productWords.some(word => text.includes(word));
    const hasSelectors = productSelectors.some(selector => $(selector).length > 0);
    
    return hasWords && hasSelectors;
  }

  /**
   * Check for article indicators
   */
  private hasArticleIndicators($: cheerio.CheerioAPI, text: string, html: string): boolean {
    const articleWords = ['author', 'published', 'article', 'blog', 'post'];
    const articleSelectors = ['.author', '.date', 'time', '.article', '.post'];
    
    const hasWords = articleWords.some(word => text.includes(word));
    const hasSelectors = articleSelectors.some(selector => $(selector).length > 0);
    const hasLongContent = text.length > 500;
    
    return (hasWords || hasSelectors) && hasLongContent;
  }

  /**
   * Check for contact indicators
   */
  private hasContactIndicators($: cheerio.CheerioAPI, text: string, html: string): boolean {
    const contactWords = ['contact', 'email', 'phone', 'address', 'location'];
    const hasWords = contactWords.some(word => text.includes(word));
    const hasEmail = html.includes('mailto:') || /\S+@\S+\.\S+/.test(text);
    const hasPhone = /\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}/.test(text);
    
    return hasWords && (hasEmail || hasPhone);
  }

  /**
   * Check for event indicators
   */
  private hasEventIndicators($: cheerio.CheerioAPI, text: string, html: string): boolean {
    const eventWords = ['event', 'date', 'location', 'venue', 'ticket', 'register'];
    const hasWords = eventWords.some(word => text.includes(word));
    const hasDate = $('time').length > 0 || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text);
    
    return hasWords && hasDate;
  }

  /**
   * Check for job indicators
   */
  private hasJobIndicators($: cheerio.CheerioAPI, text: string, html: string): boolean {
    const jobWords = ['job', 'career', 'position', 'salary', 'employment', 'apply'];
    const hasWords = jobWords.some(word => text.includes(word));
    const hasJobStructure = $('.company').length > 0 || $('.salary').length > 0;
    
    return hasWords || hasJobStructure;
  }

  /**
   * Create generic schema for unknown content types
   */
  private createGenericSchema($: cheerio.CheerioAPI): ExtractionSchema {
    return {
      name: 'generic',
      version: '1.0',
      fields: {
        title: { type: 'text', selector: 'h1, h2, .title', required: true },
        content: { type: 'text', selector: 'p, .content, .text' },
        links: { type: 'array', selector: 'a', multiple: true, attribute: 'href' },
        images: { type: 'array', selector: 'img', multiple: true, attribute: 'src' }
      }
    };
  }

  /**
   * Calculate quality score for extraction
   */
  private calculateQualityScore(extractedFields: { [key: string]: any }, schema: ExtractionSchema): number {
    let totalFields = 0;
    let extractedCount = 0;
    let requiredCount = 0;
    let requiredExtracted = 0;

    for (const [fieldName, fieldDef] of Object.entries(schema.fields)) {
      totalFields++;
      if (fieldDef.required) {
        requiredCount++;
      }

      if (extractedFields[fieldName] !== null && extractedFields[fieldName] !== undefined) {
        extractedCount++;
        if (fieldDef.required) {
          requiredExtracted++;
        }
      }
    }

    // Base score: percentage of fields extracted
    const baseScore = totalFields > 0 ? extractedCount / totalFields : 0;
    
    // Required fields bonus/penalty
    const requiredScore = requiredCount > 0 ? requiredExtracted / requiredCount : 1;
    
    // Combine scores with higher weight on required fields
    const finalScore = (baseScore * 0.6) + (requiredScore * 0.4);
    
    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Get available schemas
   */
  getAvailableSchemas(): string[] {
    return Array.from(this.defaultSchemas.keys());
  }

  /**
   * Get schema definition
   */
  getSchema(name: string): ExtractionSchema | undefined {
    return this.defaultSchemas.get(name);
  }

  /**
   * Add custom schema
   */
  addCustomSchema(schema: ExtractionSchema): void {
    this.defaultSchemas.set(schema.name, schema);
  }
} 