import fs from 'fs/promises';
import path from 'path';
import { BaseExporter, ExportResult } from './baseExporter';

export class JSONExporter extends BaseExporter {
  async export(): Promise<ExportResult> {
    try {
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(exportsDir, { recursive: true });

      // Generate filename
      const fileName = this.generateFileName('json');
      const filePath = path.join(exportsDir, fileName);

      // Prepare export data
      const exportPayload = {
        metadata: {
          exportedAt: new Date().toISOString(),
          exporter: 'ScrapperX Enhanced JSON Exporter v1.0',
          format: 'json',
          options: this.options
        },
        session: this.exportData.session,
        summary: {
          totalPages: this.exportData.content.length,
          structuredDataItems: this.exportData.structuredData?.length || 0,
          hasAIAnalysis: !!this.exportData.aiAnalysis,
          hasPatternAnalysis: !!this.exportData.patternAnalysis
        },
        content: this.exportData.content,
        ...(this.options.includeStructuredData && this.exportData.structuredData && {
          structuredData: {
            summary: {
              totalItems: this.exportData.structuredData.length,
              schemas: [...new Set(this.exportData.structuredData.map(item => item.schema))],
              averageQuality: this.exportData.structuredData.reduce((sum, item) => sum + item.qualityScore, 0) / this.exportData.structuredData.length
            },
            items: this.filterByQuality(this.exportData.structuredData)
          }
        }),
        ...(this.options.includeAIAnalysis && this.exportData.aiAnalysis && {
          aiAnalysis: this.exportData.aiAnalysis
        }),
        ...(this.options.includePatternAnalysis && this.exportData.patternAnalysis && {
          patternAnalysis: this.exportData.patternAnalysis
        })
      };

      // Write file with pretty formatting
      await fs.writeFile(filePath, JSON.stringify(exportPayload, null, 2), 'utf8');

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        fileName,
        filePath,
        mimeType: 'application/json',
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
} 