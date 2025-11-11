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
    const structuredData = this.exportData.structuredData || [];
    
    let markdown = '';

    // Header
    markdown += `# Website Crawl Report\n\n`;
    markdown += `**Domain:** ${session.domain}\n`;
    markdown += `**Start URL:** ${session.startUrl}\n`;
    markdown += `**Crawl Date:** ${new Date(session.stats.startTime).toLocaleDateString()}\n`;
    markdown += `**Pages Processed:** ${session.stats.pagesProcessed}\n`;
    markdown += `**Items Extracted:** ${session.stats.extractedItems}\n\n`;

    // AI Analysis (if enabled)
    if (this.options.includeAIAnalysis && this.exportData.aiAnalysis) {
      markdown += `## 🤖 AI Analysis Summary\n\n`;
      markdown += `- **Primary Content Type:** ${this.exportData.aiAnalysis.primaryContentType}\n`;
      markdown += `- **Quality Score:** ${Math.round(this.exportData.aiAnalysis.qualityScore)}/100\n`;
      markdown += `- **Patterns Found:** ${this.exportData.aiAnalysis.patternsFound}\n`;
      markdown += `- **Average Confidence:** ${Math.round(this.exportData.aiAnalysis.averageConfidence * 100)}%\n`;
      markdown += `- **Pages Analyzed:** ${this.exportData.aiAnalysis.analyzedPages}\n\n`;

      if (this.exportData.aiAnalysis.recommendations?.length) {
        markdown += `### AI Recommendations\n\n`;
        this.exportData.aiAnalysis.recommendations.forEach((rec: string) => {
          markdown += `- ${rec}\n`;
        });
        markdown += `\n`;
      }
    }

    // Structured Data Summary
    if (this.options.includeStructuredData && structuredData.length > 0) {
      markdown += `## 📊 Structured Data Summary\n\n`;
      markdown += `Total items extracted: **${structuredData.length}**\n\n`;

      // Group by schema type
      const groupedData = this.groupDataBySchema(structuredData);
      Object.entries(groupedData).forEach(([schema, items]) => {
        markdown += `### ${schema.charAt(0).toUpperCase() + schema.slice(1)} Data (${items.length} items)\n\n`;
        
        items.slice(0, 10).forEach((item, index) => {
          markdown += `#### ${index + 1}. ${item.title || item.url}\n\n`;
          markdown += `**URL:** ${item.url}\n\n`;
          
          if (item.fields && Object.keys(item.fields).length > 0) {
            markdown += `**Extracted Data:**\n`;
            Object.entries(item.fields).forEach(([key, value]) => {
              if (value && value !== '') {
                const displayValue = Array.isArray(value) 
                  ? value.slice(0, 3).join(', ') + (value.length > 3 ? '...' : '')
                  : String(value).slice(0, 200) + (String(value).length > 200 ? '...' : '');
                markdown += `- **${this.formatFieldName(key)}:** ${displayValue}\n`;
              }
            });
            markdown += `\n`;
          }

          if (item.qualityScore) {
            markdown += `**Quality Score:** ${Math.round(item.qualityScore * 100)}/100\n\n`;
          }

          markdown += `---\n\n`;
        });

        if (items.length > 10) {
          markdown += `*... and ${items.length - 10} more ${schema} items*\n\n`;
        }
      });
    }

    // Page Content Summary
    markdown += `## 📄 Pages Crawled\n\n`;
    content.slice(0, 20).forEach((page, index) => {
      markdown += `### ${index + 1}. ${page.title || 'Untitled Page'}\n\n`;
      markdown += `**URL:** ${page.url}\n\n`;
      
      if (page.description) {
        markdown += `**Description:** ${page.description}\n\n`;
      }

      if (this.options.includeAIAnalysis && page.metadata.aiContentType) {
        markdown += `**Content Type:** ${page.metadata.aiContentType}\n`;
        if (page.metadata.confidence) {
          markdown += `**AI Confidence:** ${Math.round(page.metadata.confidence * 100)}%\n`;
        }
        markdown += `\n`;
      }

      if (page.metadata.structuredData && Object.keys(page.metadata.structuredData).length > 0) {
        markdown += `**Key Data:**\n`;
        Object.entries(page.metadata.structuredData)
          .filter(([key, value]) => value && value !== '')
          .slice(0, 5)
          .forEach(([key, value]) => {
            const displayValue = Array.isArray(value) 
              ? value.slice(0, 2).join(', ')
              : String(value).slice(0, 100);
            markdown += `- **${this.formatFieldName(key)}:** ${displayValue}\n`;
          });
        markdown += `\n`;
      }

      // Images information
      if (page.images && page.images.length > 0) {
        markdown += `**Images Found:** ${page.images.length}\n`;
        const imagesByType = page.images.reduce((acc, img) => {
          acc[img.type] = (acc[img.type] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });
        
        markdown += `**Image Types:** ${Object.entries(imagesByType).map(([type, count]) => `${count} ${type}`).join(', ')}\n\n`;
        
        // Show first few image URLs
        if (page.images.length <= 5) {
          markdown += `**Image URLs:**\n`;
          page.images.forEach(img => {
            markdown += `- ![${img.alt || 'Image'}](${img.src}) *(${img.type})*\n`;
          });
          markdown += `\n`;
        }
      }

      // Content preview
      const contentPreview = this.flattenContentChunks(page.contentChunks || []).slice(0, 300);
      if (contentPreview.length > 0) {
        markdown += `**Content Preview:**\n> ${contentPreview}${contentPreview.length === 300 ? '...' : ''}\n\n`;
      }

      markdown += `---\n\n`;
    });

    if (content.length > 20) {
      markdown += `*... and ${content.length - 20} more pages*\n\n`;
    }

    // Footer
    markdown += `---\n\n`;
    markdown += `*Report generated on ${new Date().toLocaleString()}*\n`;
    markdown += `*Powered by ScrapperX Domain Crawler*\n`;

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