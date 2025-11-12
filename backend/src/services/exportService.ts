import { RawContent } from '../models/crawlerModels';
import { DomainCrawlerService } from './domainCrawler';
import { 
  ExportData, 
  ExportOptions, 
  ExportResult, 
  ContentItem, 
  StructuredDataItem 
} from './exporters/baseExporter';
import { JSONExporter } from './exporters/jsonExporter';
import { MarkdownExporter } from './exporters/markdownExporter';
import fs from 'fs/promises';
import path from 'path';
const archiver = require('archiver');

export class ExportService {
  private crawlerService: DomainCrawlerService;

  constructor() {
    this.crawlerService = new DomainCrawlerService();
  }

  /**
   * Export session data in the specified format
   */
  async exportSession(sessionId: string, options: ExportOptions): Promise<ExportResult> {
    try {
      // Get export data
      const exportData = await this.prepareExportData(sessionId, options);
      
      // Select exporter based on format
      let exporter: any;
      switch (options.format) {
        case 'json':
          exporter = new JSONExporter(sessionId, exportData, options);
          break;
        case 'markdown':
          exporter = new MarkdownExporter(sessionId, exportData, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}. Supported formats: json, markdown`);
      }

      // Export data
      const result = await exporter.export();

      // Compress if requested
      if (options.compress && result.success) {
        return await this.compressExport(result);
      }

      return result;

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

  /**
   * Export session data in multiple formats
   */
  async exportMultipleFormats(
    sessionId: string, 
    formats: Array<'json' | 'markdown'>,
    baseOptions: Omit<ExportOptions, 'format'>
  ): Promise<ExportResult> {
    try {
      const exportData = await this.prepareExportData(sessionId, { ...baseOptions, format: 'json' });
      const results: ExportResult[] = [];

      // Export in all requested formats
      for (const format of formats) {
        const options = { ...baseOptions, format };
        let exporter;

        switch (format) {
          case 'json':
            exporter = new JSONExporter(sessionId, exportData, options);
            break;
          case 'markdown':
            exporter = new MarkdownExporter(sessionId, exportData, options);
            break;
          default:
            throw new Error(`Unsupported export format: ${format}. Supported formats: json, markdown`);
        }

        const result = await exporter.export();
        if (result.success) {
          results.push(result);
        }
      }

      if (results.length === 0) {
        throw new Error('No exports were successful');
      }

      // Create a zip file with all formats
      return await this.createMultiFormatZip(sessionId, results);

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

  /**
   * Get export history and manage export files
   */
  async getExportHistory(): Promise<any[]> {
    try {
      const exportsDir = path.join(process.cwd(), 'exports');
      const files = await fs.readdir(exportsDir);
      
      const exports = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(exportsDir, file);
          const stats = await fs.stat(filePath);
          
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            downloadUrl: `/api/downloads/${file}`
          };
        })
      );

      return exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      return [];
    }
  }

  /**
   * Clean up old export files
   */
  async cleanupOldExports(olderThanDays: number = 7): Promise<number> {
    try {
      const exportsDir = path.join(process.cwd(), 'exports');
      const files = await fs.readdir(exportsDir);
      const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(exportsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return deletedCount;

    } catch (error) {
      return 0;
    }
  }

  /**
   * Prepare export data by collecting all relevant information
   */
  private async prepareExportData(sessionId: string, options: ExportOptions): Promise<ExportData> {
    // Get session
    const session = await this.crawlerService.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get all content
    const content = await RawContent.find({ sessionId })
      .select('-htmlContent')
      .sort({ createdAt: 1 });

    // Map content to ContentItem format
    const contentItems: ContentItem[] = content.map(item => ({
      url: item.url,
      title: item.metadata.title || '',
      description: item.metadata.description || '',
      content: item.markdownContent || item.textContent || '', // Use clean markdown first, fallback to text
      processingStatus: item.processingStatus,
      metadata: {
        title: item.metadata.title || '',
        description: item.metadata.description || '',
        structuredData: item.metadata.structuredData
      },
      contentChunks: item.contentChunks,
      extractedLinks: item.extractedLinks,
      images: item.images,
      createdAt: item.createdAt
    }));

    // Prepare structured data if requested
    let structuredData: StructuredDataItem[] | undefined;
    if (options.includeStructuredData) {
      const structuredContent = await RawContent.find({
        sessionId,
        'metadata.extractedData': { $exists: true }
      });

      structuredData = structuredContent
        .filter(item => item.metadata.extractedData)
        .map(item => {
          const extractedData = item.metadata.extractedData!;
          return {
            url: item.url,
            schema: extractedData.schema,
            version: extractedData.version,
            fields: extractedData.fields,
            nestedStructures: extractedData.nestedStructures,
            qualityScore: extractedData.qualityScore,
            extractionMethod: extractedData.extractionMethod,
            extractedAt: extractedData.extractedAt
          };
        });
    }


    return {
      session: {
        sessionId: session.sessionId,
        domain: session.domain,
        startUrl: session.startUrl,
        status: session.status,
        config: session.config,
        stats: session.stats,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      },
      content: contentItems,
      structuredData
    };
  }

  /**
   * Compress an export file into a zip
   */
  private async compressExport(exportResult: ExportResult): Promise<ExportResult> {
    try {
      const zipFileName = exportResult.fileName.replace(/\.[^.]+$/, '.zip');
      const zipFilePath = path.join(path.dirname(exportResult.filePath), zipFileName);

      const output = require('fs').createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          // Delete original file
          await fs.unlink(exportResult.filePath);
          
          // Get zip file stats
          const stats = await fs.stat(zipFilePath);

          resolve({
            success: true,
            fileName: zipFileName,
            filePath: zipFilePath,
            mimeType: 'application/zip',
            size: stats.size,
            downloadUrl: `/api/downloads/${zipFileName}`
          });
        });

        archive.on('error', reject);
        archive.pipe(output);
        archive.file(exportResult.filePath, { name: exportResult.fileName });
        archive.finalize();
      });

    } catch (error) {
      return exportResult; // Return original if compression fails
    }
  }

  /**
   * Create a zip file containing multiple export formats
   */
  private async createMultiFormatZip(sessionId: string, results: ExportResult[]): Promise<ExportResult> {
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const zipFileName = `multi-format-export_${sessionId}_${timestamp}.zip`;
      const zipFilePath = path.join(path.dirname(results[0].filePath), zipFileName);

      const output = require('fs').createWriteStream(zipFilePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          // Delete original files
          for (const result of results) {
            await fs.unlink(result.filePath).catch(() => {});
          }
          
          // Get zip file stats
          const stats = await fs.stat(zipFilePath);

          resolve({
            success: true,
            fileName: zipFileName,
            filePath: zipFilePath,
            mimeType: 'application/zip',
            size: stats.size,
            downloadUrl: `/api/downloads/${zipFileName}`
          });
        });

        archive.on('error', reject);
        archive.pipe(output);
        
        // Add all export files to zip
        results.forEach(result => {
          archive.file(result.filePath, { name: result.fileName });
        });
        
        archive.finalize();
      });

    } catch (error) {
      throw error;
    }
  }
} 