import fs from 'fs/promises';
import path from 'path';
import * as csvWriter from 'csv-writer';
import { BaseExporter, ExportResult } from './baseExporter';

export class CSVExporter extends BaseExporter {
  async export(): Promise<ExportResult> {
    try {
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(exportsDir, { recursive: true });

      // Generate filename
      const fileName = this.generateFileName('csv');
      const filePath = path.join(exportsDir, fileName);

      if (this.options.includeStructuredData && this.exportData.structuredData?.length) {
        // Export structured data in CSV format
        await this.exportStructuredDataCSV(filePath);
      } else {
        // Export basic content data
        await this.exportContentCSV(filePath);
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        fileName,
        filePath,
        mimeType: 'text/csv',
        size: stats.size,
        downloadUrl: `/api/downloads/${fileName}`
      };

    } catch (error) {
      return {
        success: false,
        fileName: '',
        filePath: '',
        mimeType: '',
        size: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async exportContentCSV(filePath: string): Promise<void> {
    // Collect all unique field names from structured data
    const allStructuredFields = new Set<string>();
    this.exportData.content.forEach(item => {
      if (item.metadata.structuredData && Object.keys(item.metadata.structuredData).length > 0) {
        Object.keys(item.metadata.structuredData).forEach(field => allStructuredFields.add(field));
      }
    });

    // Build dynamic headers
    const headers = [
      { id: 'url', title: 'URL' },
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
      { id: 'processingStatus', title: 'Status' },
      { id: 'contentLength', title: 'Content Length' },
      { id: 'linkCount', title: 'Links Found' },
      { id: 'imageCount', title: 'Images Found' },
      { id: 'createdAt', title: 'Crawled At' }
    ];

    // Add structured data field headers
    Array.from(allStructuredFields).forEach(field => {
      headers.push({ id: field, title: this.formatFieldName(field) });
    });

    // Add AI fields only if AI analysis is enabled
    if (this.options.includeAIAnalysis) {
      headers.push(
        { id: 'aiContentType', title: 'AI Content Type' },
        { id: 'confidence', title: 'AI Confidence' },
        { id: 'relevanceScore', title: 'Relevance Score' }
      );
    }

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    const records = this.exportData.content.map(item => {
      const record: any = {
        url: item.url,
        title: item.title || '',
        description: item.description || '',
        processingStatus: item.processingStatus,
        contentLength: this.flattenContentChunks(item.contentChunks).length,
        linkCount: this.getLinksCount(item.extractedLinks),
        imageCount: item.images?.length || 0,
        createdAt: item.createdAt.toISOString()
      };

      // Add structured data fields
      if (item.metadata.structuredData && Object.keys(item.metadata.structuredData).length > 0) {
        Object.entries(item.metadata.structuredData).forEach(([key, value]) => {
          record[key] = this.flattenValue(value);
        });
      }

      // Add AI fields only if enabled
      if (this.options.includeAIAnalysis) {
        record.aiContentType = item.metadata.aiContentType || '';
        record.confidence = item.metadata.confidence ? Math.round(item.metadata.confidence * 100) + '%' : '';
        record.relevanceScore = item.metadata.relevanceScore ? Math.round(item.metadata.relevanceScore * 100) + '%' : '';
      }

      return record;
    });

    await writer.writeRecords(records);
  }

  private async exportStructuredDataCSV(filePath: string): Promise<void> {
    if (!this.exportData.structuredData?.length) return;

    const filteredData = this.filterByQuality(this.exportData.structuredData);
    
    // Get all unique field names across all items
    const allFields = new Set<string>();
    filteredData.forEach(item => {
      Object.keys(item.fields).forEach(field => allFields.add(field));
    });

    // Create headers
    const headers = [
      { id: 'url', title: 'URL' },
      { id: 'schema', title: 'Schema' },
      { id: 'qualityScore', title: 'Quality Score' },
      { id: 'extractionMethod', title: 'Extraction Method' },
      { id: 'extractedAt', title: 'Extracted At' },
      ...Array.from(allFields).map(field => ({ id: field, title: field }))
    ];

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    // Flatten structured data
    const records = filteredData.map(item => {
      const record: any = {
        url: item.url,
        schema: item.schema,
        qualityScore: item.qualityScore,
        extractionMethod: item.extractionMethod,
        extractedAt: item.extractedAt.toISOString()
      };

      // Add all field values
      Array.from(allFields).forEach(field => {
        const value = item.fields[field];
        record[field] = this.flattenValue(value);
      });

      return record;
    });

    await writer.writeRecords(records);
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }

  private flattenValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
} 