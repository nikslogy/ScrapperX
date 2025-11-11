import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';
import { BaseExporter, ExportResult } from './baseExporter';

export class ExcelExporter extends BaseExporter {
  async export(): Promise<ExportResult> {
    try {
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(exportsDir, { recursive: true });

      // Generate filename
      const fileName = this.generateFileName('xlsx');
      const filePath = path.join(exportsDir, fileName);

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Add session summary worksheet
      this.addSessionSummary(workbook);

      // Add content worksheet
      this.addContentSheet(workbook);

      // Add structured data worksheet if available
      if (this.options.includeStructuredData && this.exportData.structuredData?.length) {
        this.addStructuredDataSheet(workbook);
        this.addStructuredDataBySchema(workbook);
      }

      // Add AI analysis worksheet if available
      if (this.options.includeAIAnalysis && this.exportData.aiAnalysis) {
        this.addAIAnalysisSheet(workbook);
      }

      // Write file
      XLSX.writeFile(workbook, filePath);

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        fileName,
        filePath,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

  private addSessionSummary(workbook: XLSX.WorkBook): void {
    const summaryData = [
      ['Session Information', ''],
      ['Session ID', this.exportData.session.sessionId],
      ['Domain', this.exportData.session.domain],
      ['Start URL', this.exportData.session.startUrl],
      ['Status', this.exportData.session.status],
      ['Created At', this.exportData.session.createdAt.toISOString()],
      ['Updated At', this.exportData.session.updatedAt.toISOString()],
      ['', ''],
      ['Statistics', ''],
      ['Total Pages', this.exportData.content.length],
      ['Structured Data Items', this.exportData.structuredData?.length || 0],
      ['Has AI Analysis', this.exportData.aiAnalysis ? 'Yes' : 'No'],
      ['Has Pattern Analysis', this.exportData.patternAnalysis ? 'Yes' : 'No'],
      ['', ''],
      ['Export Information', ''],
      ['Exported At', new Date().toISOString()],
      ['Export Format', 'Excel (.xlsx)'],
      ['Exporter', 'ScrapperX Enhanced Excel Exporter v1.0']
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 50 }
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
  }

  private addContentSheet(workbook: XLSX.WorkBook): void {
    const contentData = this.exportData.content.map(item => {
      const baseData: any = {
        'URL': item.url,
        'Title': item.title || '',
        'Description': item.description || '',
        'Status': item.processingStatus,
        'Crawled At': item.createdAt.toISOString()
      };

      // Add structured data fields if available
      if (item.metadata.structuredData && Object.keys(item.metadata.structuredData).length > 0) {
        Object.entries(item.metadata.structuredData).forEach(([key, value]) => {
          if (value && value !== '') {
            const formattedKey = this.formatFieldName(key);
            baseData[formattedKey] = this.flattenValue(value);
          }
        });
      }

      // Add AI analysis fields only if AI is enabled
      if (this.options.includeAIAnalysis) {
        baseData['AI Content Type'] = item.metadata.aiContentType || '';
        baseData['AI Confidence'] = item.metadata.confidence ? Math.round(item.metadata.confidence * 100) + '%' : '';
        baseData['Relevance Score'] = item.metadata.relevanceScore ? Math.round(item.metadata.relevanceScore * 100) + '%' : '';
      }

      // Add content metrics
      baseData['Content Length'] = this.flattenContentChunks(item.contentChunks).length;
      baseData['Links Found'] = this.getLinksCount(item.extractedLinks);
      baseData['Images Found'] = item.images?.length || 0;
      if (item.images && item.images.length > 0) {
        baseData['Image URLs'] = item.images.slice(0, 3).map(img => img.src).join(', ') + 
                                 (item.images.length > 3 ? '...' : '');
      }

      return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(contentData);
    
    // Auto-fit columns based on content
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    worksheet['!cols'] = [];
    for (let i = 0; i <= range.e.c; i++) {
      worksheet['!cols'].push({ wch: i < 3 ? 50 : 25 }); // Make URL, Title, Description wider
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Content');
  }

  private addStructuredDataSheet(workbook: XLSX.WorkBook): void {
    if (!this.exportData.structuredData?.length) return;

    const filteredData = this.filterByQuality(this.exportData.structuredData);
    
    // Get all unique field names
    const allFields = new Set<string>();
    filteredData.forEach(item => {
      Object.keys(item.fields).forEach(field => allFields.add(field));
    });

    const structuredData = filteredData.map(item => {
      const record: any = {
        'URL': item.url,
        'Schema': item.schema,
        'Quality Score': item.qualityScore,
        'Extraction Method': item.extractionMethod,
        'Extracted At': item.extractedAt.toISOString()
      };

      // Add all field values
      Array.from(allFields).forEach(field => {
        record[field] = this.flattenValue(item.fields[field]);
      });

      return record;
    });

    const worksheet = XLSX.utils.json_to_sheet(structuredData);
    
    // Auto-fit columns
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    worksheet['!cols'] = [];
    for (let i = 0; i <= range.e.c; i++) {
      worksheet['!cols'].push({ wch: 25 });
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Structured Data');
  }

  private addStructuredDataBySchema(workbook: XLSX.WorkBook): void {
    if (!this.exportData.structuredData?.length) return;

    const filteredData = this.filterByQuality(this.exportData.structuredData);
    const schemaGroups = this.groupBySchema(filteredData);

    Object.entries(schemaGroups).forEach(([schema, items]) => {
      if (items.length === 0) return;

      const schemaData = items.map(item => {
        const record: any = {
          'URL': item.url,
          'Quality Score': item.qualityScore,
          'Extraction Method': item.extractionMethod,
          'Extracted At': item.extractedAt.toISOString()
        };

        // Add schema-specific fields
        Object.entries(item.fields).forEach(([key, value]) => {
          record[key] = this.flattenValue(value);
        });

        return record;
      });

      const worksheet = XLSX.utils.json_to_sheet(schemaData);
      
      // Auto-fit columns
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      worksheet['!cols'] = [];
      for (let i = 0; i <= range.e.c; i++) {
        worksheet['!cols'].push({ wch: 20 });
      }

      // Limit sheet name to Excel's 31 character limit
      const sheetName = schema.length > 28 ? schema.substring(0, 28) + '...' : schema;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
  }

  private addAIAnalysisSheet(workbook: XLSX.WorkBook): void {
    if (!this.exportData.aiAnalysis) return;

    const analysis = this.exportData.aiAnalysis;
    const analysisData = [
      ['AI Analysis Results', ''],
      ['Primary Content Type', analysis.primaryContentType || ''],
      ['Quality Score', analysis.qualityScore || ''],
      ['Confidence', analysis.confidence || ''],
      ['Analyzed Pages', analysis.analyzedPages || ''],
      ['', ''],
      ['Content Distribution', '']
    ];

    // Add content distribution if available
    if (analysis.contentDistribution) {
      Object.entries(analysis.contentDistribution).forEach(([type, count]) => {
        analysisData.push([type, count as string]);
      });
    }

    // Add patterns if available
    if (analysis.patterns && analysis.patterns.length > 0) {
      analysisData.push(['', '']);
      analysisData.push(['Detected Patterns', '']);
      analysis.patterns.forEach((pattern: any, index: number) => {
        analysisData.push([`Pattern ${index + 1}`, pattern.description || pattern.type || '']);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(analysisData);
    worksheet['!cols'] = [{ wch: 25 }, { wch: 50 }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'AI Analysis');
  }

  private groupBySchema(items: any[]): { [key: string]: any[] } {
    return items.reduce((groups, item) => {
      const schema = item.schema;
      if (!groups[schema]) {
        groups[schema] = [];
      }
      groups[schema].push(item);
      return groups;
    }, {});
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