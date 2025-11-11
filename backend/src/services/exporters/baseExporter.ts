export interface ExportData {
  session: {
    sessionId: string;
    domain: string;
    startUrl: string;
    status: string;
    config: any;
    stats: any;
    createdAt: Date;
    updatedAt: Date;
  };
  content: ContentItem[];
  structuredData?: StructuredDataItem[];
  aiAnalysis?: any;
  patternAnalysis?: any;
}

export interface ContentItem {
  url: string;
  title: string;
  description: string;
  processingStatus: string;
  metadata: {
    title: string;
    description: string;
    aiContentType?: string;
    confidence?: number;
    relevanceScore?: number;
    structuredData?: any;
    aiAnalysis?: any;
  };
  contentChunks: Array<string | { type: string; selector: string; content: string; confidence: number; }>;
  extractedLinks: string[] | { internal: string[]; external: string[]; };
  images?: {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    type: 'logo' | 'product' | 'content' | 'avatar' | 'icon' | 'unknown';
  }[];
  createdAt: Date;
}

export interface StructuredDataItem {
  url: string;
  schema: string;
  version: string;
  fields: Record<string, any>;
  nestedStructures?: any[];
  qualityScore: number;
  extractionMethod: string;
  extractedAt: Date;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel' | 'markdown' | 'xml';
  includeStructuredData?: boolean;
  includeAIAnalysis?: boolean;
  includePatternAnalysis?: boolean;
  minQualityScore?: number;
  compress?: boolean;
  flattenData?: boolean;
}

export interface ExportResult {
  success: boolean;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  downloadUrl?: string;
  error?: string;
}

export abstract class BaseExporter {
  protected sessionId: string;
  protected exportData: ExportData;
  protected options: ExportOptions;

  constructor(sessionId: string, exportData: ExportData, options: ExportOptions) {
    this.sessionId = sessionId;
    this.exportData = exportData;
    this.options = options;
  }

  abstract export(): Promise<ExportResult>;

  protected generateFileName(extension: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const domain = this.exportData.session.domain.replace(/[^a-zA-Z0-9]/g, '_');
    return `${domain}_${this.sessionId}_${timestamp}.${extension}`;
  }

  protected filterByQuality(items: StructuredDataItem[]): StructuredDataItem[] {
    if (!this.options.minQualityScore) return items;
    return items.filter(item => item.qualityScore >= this.options.minQualityScore!);
  }

  protected flattenContentChunks(chunks: Array<string | { type: string; selector: string; content: string; confidence: number; }>): string {
    return chunks.map(chunk => 
      typeof chunk === 'string' ? chunk : chunk.content
    ).join(' ');
  }

  protected getLinksCount(links: string[] | { internal: string[]; external: string[]; }): number {
    if (Array.isArray(links)) {
      return links.length;
    }
    return (links.internal?.length || 0) + (links.external?.length || 0);
  }
} 