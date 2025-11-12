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

      // Clean, structured export data
      const exportPayload = {
        domain: this.exportData.session.domain,
        startUrl: this.exportData.session.startUrl,
        crawledAt: this.exportData.session.stats.startTime,
        pages: this.exportData.content.map(page => ({
          url: page.url,
          title: page.title,
          description: page.description,
          content: page.content || this.flattenContentChunks(page.contentChunks || []),
          links: Array.isArray(page.extractedLinks) 
            ? page.extractedLinks 
            : [...(page.extractedLinks?.internal || []), ...(page.extractedLinks?.external || [])],
          images: page.images?.map(img => ({
            src: img.src,
            alt: img.alt
          })) || [],
          structuredData: page.metadata.structuredData || {}
        }))
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