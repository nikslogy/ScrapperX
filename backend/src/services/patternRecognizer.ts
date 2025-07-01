import { IRawContent, ICrawlPattern } from '../models/crawlerModels';
import { AIContentAnalyzer, AIAnalysisResult, ContentPattern } from './aiContentAnalyzer';
import { CrawlPattern } from '../models/crawlerModels';
import { Types } from 'mongoose';

export interface PatternStats {
  totalPages: number;
  analyzedPages: number;
  patternsFound: number;
  contentTypes: {
    [key: string]: number;
  };
  averageConfidence: number;
  patternsByType: {
    [key: string]: ContentPattern[];
  };
}

export interface DomainInsights {
  primaryContentType: string;
  confidence: number;
  commonPatterns: ContentPattern[];
  structuredDataSample: any[];
  recommendations: string[];
  qualityScore: number;
}

export class PatternRecognizer {
  private aiAnalyzer: AIContentAnalyzer;
  private patterns: Map<string, ContentPattern> = new Map();
  private analysisCache: Map<string, AIAnalysisResult> = new Map();

  constructor() {
    this.aiAnalyzer = new AIContentAnalyzer();
  }

  /**
   * Analyze domain content and recognize patterns
   */
  async recognizePatterns(contents: IRawContent[], sessionId: string): Promise<PatternStats> {
    console.log(`🔍 Starting pattern recognition for ${contents.length} content items`);
    
    const stats: PatternStats = {
      totalPages: contents.length,
      analyzedPages: 0,
      patternsFound: 0,
      contentTypes: {},
      averageConfidence: 0,
      patternsByType: {}
    };

    let totalConfidence = 0;

    // Process content in batches to avoid overwhelming the AI API
    const batchSize = 5;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      
      // Analyze batch in parallel
      const batchPromises = batch.map(async (content) => {
        try {
          const analysis = await this.aiAnalyzer.analyzeContent(content);
          
          // Cache the analysis
          const contentId = content._id instanceof Types.ObjectId ? content._id.toString() : String(content._id);
          this.analysisCache.set(contentId, analysis);
          
          // Update content processing status
          await this.updateContentProcessingStatus(content, analysis);
          
          // Update statistics
          stats.analyzedPages++;
          totalConfidence += analysis.confidence;
          
          // Count content types
          stats.contentTypes[analysis.contentType] = (stats.contentTypes[analysis.contentType] || 0) + 1;
          
          // Group patterns by type
          for (const pattern of analysis.patterns) {
            if (!stats.patternsByType[pattern.type]) {
              stats.patternsByType[pattern.type] = [];
            }
            stats.patternsByType[pattern.type].push(pattern);
            
            // Store pattern for learning
            this.storePattern(pattern, sessionId);
          }
          
          return analysis;
        } catch (error) {
          console.error(`Error analyzing content ${content.url}:`, error);
          return null;
        }
      });

      await Promise.all(batchPromises);
      
      // Rate limiting between batches
      if (i + batchSize < contents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    stats.averageConfidence = stats.analyzedPages > 0 ? totalConfidence / stats.analyzedPages : 0;
    stats.patternsFound = this.patterns.size;

    console.log(`✅ Pattern recognition complete: ${stats.analyzedPages}/${stats.totalPages} analyzed`);
    
    return stats;
  }

  /**
   * Generate domain insights based on recognized patterns
   */
  generateDomainInsights(stats: PatternStats): DomainInsights {
    // Find primary content type
    const contentTypeCounts = Object.entries(stats.contentTypes);
    const primaryType = contentTypeCounts.reduce((max, current) => 
      current[1] > max[1] ? current : max, ['unknown', 0]
    );

    // Get common patterns (appearing in multiple pages)
    const commonPatterns = Array.from(this.patterns.values())
      .filter(pattern => pattern.confidence > 0.7)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    // Sample structured data
    const structuredDataSample = Array.from(this.analysisCache.values())
      .filter(analysis => analysis.shouldInclude && Object.keys(analysis.structuredData).length > 2)
      .slice(0, 5)
      .map(analysis => analysis.structuredData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(stats, primaryType[0]);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(stats);

    return {
      primaryContentType: primaryType[0],
      confidence: stats.averageConfidence,
      commonPatterns,
      structuredDataSample,
      recommendations,
      qualityScore
    };
  }

  /**
   * Update content processing status with AI analysis
   */
  private async updateContentProcessingStatus(content: IRawContent, analysis: AIAnalysisResult): Promise<void> {
    try {
      // Update processing status based on AI recommendation
      const newStatus = analysis.shouldInclude ? 'analyzed' : 'raw';
      
      // Update the content in the database
      const { RawContent } = require('../models/crawlerModels');
      
      const contentId = content._id instanceof Types.ObjectId ? content._id.toString() : String(content._id);
      await RawContent.findByIdAndUpdate(contentId, {
        processingStatus: newStatus,
        'metadata.aiContentType': analysis.contentType,
        'metadata.confidence': analysis.confidence,
        'metadata.relevanceScore': analysis.relevanceScore,
        'metadata.structuredData': Object.keys(analysis.structuredData).length > 2 ? analysis.structuredData : undefined,
        'metadata.aiAnalysis': {
          patterns: analysis.patterns.length,
          extractedFields: Object.keys(analysis.structuredData).length,
          reasoning: analysis.reasoning
        }
      });

      // Also update the local object for consistency
      content.processingStatus = newStatus;
      content.metadata.aiContentType = analysis.contentType;
      content.metadata.confidence = analysis.confidence;
      content.metadata.relevanceScore = analysis.relevanceScore;
      if (Object.keys(analysis.structuredData).length > 2) {
        content.metadata.structuredData = analysis.structuredData;
      }
      content.metadata.aiAnalysis = {
        patterns: analysis.patterns.length,
        extractedFields: Object.keys(analysis.structuredData).length,
        reasoning: analysis.reasoning
      };

    } catch (error) {
      console.error('Error updating content processing status:', error);
    }
  }

  /**
   * Store pattern for learning and optimization
   */
  private storePattern(pattern: ContentPattern, sessionId: string): void {
    const patternKey = `${pattern.type}-${pattern.description}`;
    
    if (this.patterns.has(patternKey)) {
      const existing = this.patterns.get(patternKey)!;
      // Increase confidence if pattern is found multiple times
      existing.confidence = Math.min(0.95, existing.confidence + 0.05);
      existing.keyIndicators = [...new Set([...existing.keyIndicators, ...pattern.keyIndicators])];
    } else {
      this.patterns.set(patternKey, { ...pattern });
    }
  }

  /**
   * Generate recommendations based on pattern analysis
   */
  private generateRecommendations(stats: PatternStats, primaryType: string): string[] {
    const recommendations: string[] = [];

    // Content type recommendations
    if (primaryType === 'product') {
      recommendations.push('Consider extracting product catalogs and pricing information');
      recommendations.push('Focus on product pages for better structured data extraction');
    } else if (primaryType === 'article') {
      recommendations.push('Extract article metadata and publishing information');
      recommendations.push('Consider categorizing articles by topic or author');
    } else if (primaryType === 'contact') {
      recommendations.push('Extract contact information and business details');
      recommendations.push('Focus on location and communication channels');
    }

    // Quality recommendations
    if (stats.averageConfidence < 0.6) {
      recommendations.push('Consider improving content extraction methods for better accuracy');
    }

    // Pattern recommendations
    const patternCount = Object.keys(stats.patternsByType).length;
    if (patternCount > 5) {
      recommendations.push('Rich content structure detected - consider structured data export');
    } else if (patternCount < 3) {
      recommendations.push('Limited content patterns - focus on specific page types');
    }

    // Volume recommendations
    if (stats.totalPages > 100) {
      recommendations.push('Large site detected - consider filtering low-value content');
    } else if (stats.totalPages < 10) {
      recommendations.push('Small site - consider deeper crawling or include more page types');
    }

    return recommendations;
  }

  /**
   * Calculate overall quality score for the domain analysis
   */
  private calculateQualityScore(stats: PatternStats): number {
    let score = 0;

    // Base score from average confidence
    score += stats.averageConfidence * 40;

    // Pattern diversity bonus
    const patternTypes = Object.keys(stats.patternsByType).length;
    score += Math.min(20, patternTypes * 4);

    // Coverage bonus
    const coverage = stats.analyzedPages / stats.totalPages;
    score += coverage * 20;

    // Content type distribution bonus
    const contentTypes = Object.keys(stats.contentTypes).length;
    if (contentTypes > 1 && contentTypes < 5) {
      score += 10; // Good variety without chaos
    }

    // Structured data bonus
    const structuredDataCount = Array.from(this.analysisCache.values())
      .filter(analysis => Object.keys(analysis.structuredData).length > 2).length;
    const structuredDataRatio = structuredDataCount / stats.analyzedPages;
    score += structuredDataRatio * 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Get analysis results for a specific content item
   */
  getAnalysisResult(contentId: string): AIAnalysisResult | null {
    return this.analysisCache.get(contentId) || null;
  }

  /**
   * Get all recognized patterns
   */
  getRecognizedPatterns(): ContentPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get filtered content based on quality and relevance
   */
  getFilteredContent(contents: IRawContent[], minRelevanceScore: number = 0.5): IRawContent[] {
    return contents.filter(content => {
      const contentId = content._id instanceof Types.ObjectId ? content._id.toString() : String(content._id);
      const analysis = this.analysisCache.get(contentId);
      return analysis && analysis.shouldInclude && analysis.relevanceScore >= minRelevanceScore;
    });
  }

  /**
   * Export pattern analysis results
   */
  exportPatternAnalysis(): {
    patterns: ContentPattern[];
    analysisResults: { [contentId: string]: AIAnalysisResult };
    statistics: {
      totalPatterns: number;
      averageConfidence: number;
      contentTypeDistribution: { [type: string]: number };
    };
  } {
    const patterns = this.getRecognizedPatterns();
    const analysisResults: { [contentId: string]: AIAnalysisResult } = {};
    const contentTypeDistribution: { [type: string]: number } = {};
    
    let totalConfidence = 0;
    let count = 0;

    for (const [contentId, analysis] of this.analysisCache.entries()) {
      analysisResults[contentId] = analysis;
      contentTypeDistribution[analysis.contentType] = (contentTypeDistribution[analysis.contentType] || 0) + 1;
      totalConfidence += analysis.confidence;
      count++;
    }

    return {
      patterns,
      analysisResults,
      statistics: {
        totalPatterns: patterns.length,
        averageConfidence: count > 0 ? totalConfidence / count : 0,
        contentTypeDistribution
      }
    };
  }

  /**
   * Clear analysis cache and patterns
   */
  clearCache(): void {
    this.patterns.clear();
    this.analysisCache.clear();
  }
}