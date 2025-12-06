import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { ExportService, ExportOptions } from '../services';

/**
 * Controller for export and download operations
 */
export class ExportController {
  private exportService: ExportService;

  constructor() {
    this.exportService = new ExportService();
  }

  /**
   * Enhanced export session data with multiple formats
   */
  exportSessionData = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const {
        format = 'json',
        includeStructuredData = 'true',
        minQualityScore = '0.5',
        compress = 'false',
        multiFormat = 'false'
      } = req.query;

      const options: ExportOptions = {
        format: format as 'json' | 'markdown',
        includeStructuredData: includeStructuredData === 'true',
        minQualityScore: parseFloat(minQualityScore as string),
        compress: compress === 'true'
      };

      if (!['json', 'markdown'].includes(options.format)) {
        res.status(400).json({
          success: false,
          message: 'Unsupported export format. Supported formats: json, markdown'
        });
        return;
      }

      let result;

      if (multiFormat === 'true') {
        const formats: Array<'json' | 'markdown'> = ['json', 'markdown'];
        result = await this.exportService.exportMultipleFormats(sessionId, formats, options);
      } else {
        result = await this.exportService.exportSession(sessionId, options);
      }

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: 'Export failed',
          error: result.error
        });
        return;
      }

      res.json({
        success: true,
        message: 'Export completed successfully',
        data: {
          fileName: result.fileName,
          size: result.size,
          mimeType: result.mimeType,
          downloadUrl: result.downloadUrl,
          format: multiFormat === 'true' ? 'multi-format' : options.format
        }
      });

    } catch (error) {
      console.error('Error exporting session data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export session data',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Get export history
   */
  getExportHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const history = await this.exportService.getExportHistory();

      res.json({
        success: true,
        data: {
          exports: history,
          count: history.length
        }
      });

    } catch (error) {
      console.error('Error getting export history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get export history',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Clean up old export files
   */
  cleanupExports = async (req: Request, res: Response): Promise<void> => {
    try {
      const { olderThanDays = '7' } = req.query;
      const days = parseInt(olderThanDays as string);

      if (isNaN(days) || days < 1) {
        res.status(400).json({
          success: false,
          message: 'Invalid olderThanDays parameter. Must be a positive integer.'
        });
        return;
      }

      const deletedCount = await this.exportService.cleanupOldExports(days);

      res.json({
        success: true,
        message: `Cleanup completed successfully`,
        data: {
          deletedFiles: deletedCount,
          olderThanDays: days
        }
      });

    } catch (error) {
      console.error('Error cleaning up exports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup exports',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * Download exported file
   */
  downloadExport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileName } = req.params;
      
      if (!fileName) {
        res.status(400).json({
          success: false,
          message: 'File name is required'
        });
        return;
      }

      const filePath = path.join(process.cwd(), 'exports', fileName);
      
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          success: false,
          message: 'File not found'
        });
        return;
      }

      const mimeTypes: { [key: string]: string } = {
        '.json': 'application/json',
        '.csv': 'text/csv',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.md': 'text/markdown',
        '.zip': 'application/zip'
      };

      const ext = path.extname(fileName);
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(filePath);

    } catch (error) {
      console.error('Error downloading export:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download export',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}
