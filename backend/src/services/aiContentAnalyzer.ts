import OpenAI from 'openai';
import { IRawContent } from '../models/crawlerModels';
require('dotenv').config();

export interface ContentPattern {
  type: 'product' | 'article' | 'listing' | 'navigation' | 'contact' | 'pricing' | 'testimonial' | 'unknown';
  confidence: number;
  selectors: string[];
  description: string;
  keyIndicators: string[];
  extractedFields: {
    [key: string]: any;
  };
}

export interface AIAnalysisResult {
  contentType: ContentPattern['type'];
  confidence: number;
  structuredData: {
    title?: string;
    description?: string;
    price?: string;
    author?: string;
    date?: string;
    category?: string;
    tags?: string[];
    rating?: number;
    images?: string[];
    links?: string[];
    email?: string;
    phone?: string;
    address?: string;
    [key: string]: any;
  };
  patterns: ContentPattern[];
  relevanceScore: number;
  shouldInclude: boolean;
  reasoning: string;
}

export class AIContentAnalyzer {
  private openai: OpenAI | null = null;
  private isEnabled: boolean = false;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'ScrapperX AI Crawler'
        }
      });
      this.isEnabled = true;
      console.log('🤖 AI Content Analyzer initialized');
    } else {
      console.log('⚠️  AI Content Analyzer disabled (no API key)');
    }
  }

  /**
   * Analyze content using AI to detect patterns and extract structured data
   */
  async analyzeContent(content: IRawContent): Promise<AIAnalysisResult> {
    if (!this.isEnabled || !this.openai) {
      return this.getFallbackAnalysis(content);
    }

    try {
      const analysisPrompt = this.buildAnalysisPrompt(content);
      
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-r1:free',
        messages: [
          {
            role: 'system',
            content: `You are an expert web content analyzer. Analyze web content and return structured JSON data about content patterns, types, and extracted information. Focus on identifying:
            1. Content type (product, article, listing, navigation, contact, pricing, testimonial, etc.)
            2. Structured data extraction (titles, prices, descriptions, contact info, etc.)
            3. Content relevance and quality
            4. Recurring patterns and selectors
            
            Always respond with valid JSON matching the expected schema.`
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      return this.parseAIResponse(aiResponse, content);

    } catch (error) {
      console.error('AI Analysis error:', error);
      return this.getFallbackAnalysis(content);
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(content: IRawContent): string {
    const chunks = content.contentChunks
      .filter(chunk => chunk.confidence > 0.3)
      .slice(0, 10) // Limit chunks to avoid token limits
      .map(chunk => `${chunk.type}: ${chunk.content.substring(0, 500)}`);

    return `
Analyze this web content and provide structured analysis:

URL: ${content.url}
Title: ${content.metadata.title || 'N/A'}
Description: ${content.metadata.description || 'N/A'}

Content Chunks:
${chunks.join('\n\n')}

Text Content Sample:
${content.textContent.substring(0, 1000)}

Please analyze and return JSON with this structure:
{
  "contentType": "product|article|listing|navigation|contact|pricing|testimonial|unknown",
  "confidence": 0.0-1.0,
  "structuredData": {
    "title": "extracted title",
    "description": "extracted description",
    "price": "extracted price if product",
    "author": "author if article",
    "date": "publication date",
    "category": "content category",
    "tags": ["tag1", "tag2"],
    "rating": "rating/score if available",
    "images": ["image urls"],
    "email": "contact email if found",
    "phone": "contact phone if found",
    "address": "physical address if found"
  },
  "patterns": [{
    "type": "detected pattern type",
    "confidence": 0.0-1.0,
    "description": "pattern description",
    "keyIndicators": ["indicator1", "indicator2"]
  }],
  "relevanceScore": 0.0-1.0,
  "shouldInclude": true/false,
  "reasoning": "explanation of analysis"
}

Focus on extracting meaningful, structured data that would be valuable for users.`;
  }

  /**
   * Parse AI response and validate structure
   */
  private parseAIResponse(aiResponse: string, content: IRawContent): AIAnalysisResult {
    try {
      // Extract JSON from response if it's wrapped in markdown or text
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate and sanitize the response
      return {
        contentType: this.validateContentType(parsed.contentType),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        structuredData: parsed.structuredData || {},
        patterns: this.validatePatterns(parsed.patterns || []),
        relevanceScore: Math.max(0, Math.min(1, parsed.relevanceScore || 0.5)),
        shouldInclude: Boolean(parsed.shouldInclude !== false),
        reasoning: String(parsed.reasoning || 'AI analysis completed')
      };

    } catch (error) {
      console.error('Error parsing AI response:', error);
      return this.getFallbackAnalysis(content);
    }
  }

  /**
   * Validate content type
   */
  private validateContentType(type: string): ContentPattern['type'] {
    const validTypes: ContentPattern['type'][] = [
      'product', 'article', 'listing', 'navigation', 'contact', 'pricing', 'testimonial', 'unknown'
    ];
    return validTypes.includes(type as ContentPattern['type']) ? type as ContentPattern['type'] : 'unknown';
  }

  /**
   * Validate patterns array
   */
  private validatePatterns(patterns: any[]): ContentPattern[] {
    return patterns.filter(p => p && typeof p === 'object').map(p => ({
      type: this.validateContentType(p.type),
      confidence: Math.max(0, Math.min(1, p.confidence || 0.5)),
      selectors: Array.isArray(p.selectors) ? p.selectors : [],
      description: String(p.description || ''),
      keyIndicators: Array.isArray(p.keyIndicators) ? p.keyIndicators : [],
      extractedFields: p.extractedFields || {}
    }));
  }

  /**
   * Fallback analysis when AI is not available
   */
  private getFallbackAnalysis(content: IRawContent): AIAnalysisResult {
    const chunks = content.contentChunks;
    
    // Simple heuristic-based analysis
    let contentType: ContentPattern['type'] = 'unknown';
    let confidence = 0.3;
    
    const textLower = content.textContent.toLowerCase();
    const title = content.metadata.title?.toLowerCase() || '';
    
    // Product detection
    if (textLower.includes('price') || textLower.includes('$') || textLower.includes('buy') || textLower.includes('cart')) {
      contentType = 'product';
      confidence = 0.6;
    }
    // Article detection
    else if (chunks.some(c => c.type === 'article') || textLower.includes('author') || textLower.includes('published')) {
      contentType = 'article';
      confidence = 0.7;
    }
    // Contact detection
    else if (textLower.includes('contact') || textLower.includes('email') || textLower.includes('phone')) {
      contentType = 'contact';
      confidence = 0.8;
    }
    // Navigation detection
    else if (chunks.some(c => c.type === 'navigation') || title.includes('menu') || title.includes('nav')) {
      contentType = 'navigation';
      confidence = 0.9;
    }

    return {
      contentType,
      confidence,
      structuredData: {
        title: content.metadata.title,
        description: content.metadata.description
      },
      patterns: [{
        type: contentType,
        confidence,
        selectors: [],
        description: `Heuristic-based ${contentType} detection`,
        keyIndicators: [],
        extractedFields: {}
      }],
      relevanceScore: confidence,
      shouldInclude: confidence > 0.4,
      reasoning: 'Heuristic-based analysis (AI not available)'
    };
  }

  /**
   * Check if AI is enabled
   */
  isAIEnabled(): boolean {
    return this.isEnabled;
  }
}
