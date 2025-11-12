import fs from 'fs/promises';
import path from 'path';
import { BaseExporter, ExportResult } from './baseExporter';

export class MarkdownExporter extends BaseExporter {
  async export(): Promise<ExportResult> {
    try {
      // Create exports directory if it doesn't exist
      const exportsDir = path.join(process.cwd(), 'exports');
      await fs.mkdir(exportsDir, { recursive: true });

      // Generate filename
      const fileName = this.generateFileName('md');
      const filePath = path.join(exportsDir, fileName);

      // Generate markdown content
      const markdownContent = this.generateMarkdownContent();

      // Write file
      await fs.writeFile(filePath, markdownContent, 'utf-8');

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        fileName,
        filePath,
        mimeType: 'text/markdown',
        size: stats.size,
        downloadUrl: `/api/downloads/${fileName}`
      };

    } catch (error) {
      console.error('Error exporting to Markdown:', error);
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

  private generateMarkdownContent(): string {
    const session = this.exportData.session;
    const content = this.exportData.content;
    
    let markdown = '';

    // Clean header
    markdown += `# ${session.domain}\n\n`;
    markdown += `**Start URL:** ${session.startUrl}\n`;
    markdown += `**Crawl Date:** ${new Date(session.stats.startTime).toLocaleDateString()}\n`;
    markdown += `**Pages:** ${session.stats.pagesProcessed}\n\n`;

    // Pages content - Clean and structured
    content.forEach((page, index) => {
      markdown += `## ${index + 1}. ${page.title || 'Untitled Page'}\n\n`;
      markdown += `**URL:** ${page.url}\n\n`;
      
      if (page.description) {
        markdown += `${page.description}\n\n`;
      }

      // Content
      const pageContent = page.content || this.flattenContentChunks(page.contentChunks || []);
      if (pageContent && pageContent.trim().length > 0) {
        markdown += `${pageContent}\n\n`;
      }

      // Links
      if (page.extractedLinks) {
        const links = Array.isArray(page.extractedLinks) 
          ? page.extractedLinks 
          : [...(page.extractedLinks.internal || []), ...(page.extractedLinks.external || [])];
        
        if (links.length > 0) {
          markdown += `### Links\n\n`;
          links.forEach((link: string) => {
            markdown += `- ${link}\n`;
          });
          markdown += `\n`;
        }
      }

      // Images
      if (page.images && page.images.length > 0) {
        markdown += `### Images\n\n`;
        page.images.forEach(img => {
          markdown += `![${img.alt || 'Image'}](${img.src})\n`;
        });
        markdown += `\n`;
      }

      // Structured Data
      if (page.metadata.structuredData && Object.keys(page.metadata.structuredData).length > 0) {
        markdown += `### Extracted Data\n\n`;
        Object.entries(page.metadata.structuredData)
          .filter(([key, value]) => value && value !== '')
          .forEach(([key, value]) => {
            const displayValue = Array.isArray(value) 
              ? value.join(', ')
              : String(value);
            markdown += `- **${this.formatFieldName(key)}:** ${displayValue}\n`;
          });
        markdown += `\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  }

  private groupDataBySchema(data: any[]): { [schema: string]: any[] } {
    const grouped: { [schema: string]: any[] } = {};
    
    data.forEach(item => {
      const schema = item.schema || 'general';
      if (!grouped[schema]) {
        grouped[schema] = [];
      }
      grouped[schema].push(item);
    });

    return grouped;
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  }
} 