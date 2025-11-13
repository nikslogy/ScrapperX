'use client';

import { useState } from 'react';
import { ScrapedData } from '@/types/scraper';

interface ScrapingResultsProps {
  data: ScrapedData;
  originalUrl: string;
}

export default function ScrapingResults({ data }: ScrapingResultsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'links' | 'images' | 'metadata'>('overview');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'content', label: 'Content', icon: '📄' },
    { id: 'links', label: `Links (${data.links.length})`, icon: '🔗' },
    { id: 'images', label: `Images (${data.images.length})`, icon: '🖼️' },
    { id: 'metadata', label: 'Metadata', icon: '📋' },
  ] as const;

  const exportAsMarkdown = () => {
    // Use clean markdown if available, otherwise fall back to creating it from content
    if (data.markdownContent && data.markdownContent.length > 0) {
      // Use the clean Firecrawl-style markdown directly
      const blob = new Blob([data.markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scraped-${new URL(data.url).hostname}-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Fallback: create markdown from structured data (old method)
      let markdown = `# ${data.title || 'Scraped Content'}\n\n`;
      markdown += `**URL:** ${data.url}\n`;
      markdown += `**Scraped:** ${formatDate(data.scrapedAt)}\n\n`;
      
      if (data.description) {
        markdown += `## Description\n\n${data.description}\n\n`;
      }
      
      markdown += `## Content\n\n${data.content}\n\n`;
      
      if (data.headings.length > 0) {
        markdown += `## Headings\n\n`;
        data.headings.forEach(heading => {
          markdown += `${'#'.repeat(heading.level + 2)} ${heading.text}\n`;
        });
        markdown += `\n`;
      }
      
      if (data.links.length > 0) {
        markdown += `## Links\n\n`;
        data.links.forEach(link => {
          markdown += `- [${link.text || link.href}](${link.href})\n`;
        });
        markdown += `\n`;
      }
      
      if (data.images.length > 0) {
        markdown += `## Images\n\n`;
        data.images.forEach(img => {
          markdown += `![${img.alt || 'Image'}](${img.src})\n`;
        });
        markdown += `\n`;
      }
      
      if (Object.keys(data.metadata).length > 0) {
        markdown += `## Metadata\n\n`;
        Object.entries(data.metadata).forEach(([key, value]) => {
          if (value) {
            markdown += `- **${key}:** ${value}\n`;
          }
        });
      }

      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scraped-${new URL(data.url).hostname}-${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const exportAsJSON = () => {
    // Clean, structured JSON export
    const cleanData = {
      url: data.url,
      title: data.title,
      description: data.description,
      scrapedAt: data.scrapedAt,
      content: data.content,
      headings: data.headings,
      links: data.links.map(link => ({
        text: link.text,
        href: link.href,
        internal: link.internal
      })),
      images: data.images.map(img => ({
        src: img.src,
        alt: img.alt
      })),
      metadata: data.metadata
    };
    
    const blob = new Blob([JSON.stringify(cleanData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-${new URL(data.url).hostname}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Responsive tab navigation: show horizontal scroll and/or dropdown for small screens
  // Also fix "Metadata" tab not showing by using horizontal scroll/overflow on small screens & fixed tab width

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Scraping Complete</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportAsJSON}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            📄 JSON
          </button>
          <button
            onClick={exportAsMarkdown}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            📝 Markdown
          </button>
        </div>
      </div>
      <div className="mb-6">
        <p className="text-sm text-slate-600 break-all max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">
          {data.url}
        </p>
      </div>

      {/* Tab Navigation - responsive */}
      <div className="border-b border-slate-200 mb-6">
        {/* Small screens: horizontal scroll flex */}
        <nav
          className="flex space-x-4 sm:space-x-6 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
          aria-label="Tabs"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 py-2 px-2 min-w-[110px] border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-slate-900">{data.wordCount}</div>
                <div className="text-xs text-slate-600 mt-1">Words</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-slate-900">{data.links.length}</div>
                <div className="text-xs text-slate-600 mt-1">Links</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-slate-900">{data.images.length}</div>
                <div className="text-xs text-slate-600 mt-1">Images</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-slate-900">{data.headings.length}</div>
                <div className="text-xs text-slate-600 mt-1">Headings</div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-2">Page Info</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-slate-600">Title:</span> <span className="text-slate-900">{data.title}</span></div>
                {data.description && (
                  <div><span className="text-slate-600">Description:</span> <span className="text-slate-900">{data.description}</span></div>
                )}
                <div><span className="text-slate-600">Scraped:</span> <span className="text-slate-900">{formatDate(data.scrapedAt)}</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div>
            <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {data.content}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.links.length > 0 ? (
                data.links.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {link.text || link.href}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {link.href}
                      </p>
                    </div>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600 hover:text-slate-900 ml-2"
                    >
                      ↗️
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8">No links found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
              {data.images.length > 0 ? (
                data.images.map((image, index) => (
                  <div key={index} className="bg-slate-50 rounded-lg overflow-hidden">
                    <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={image.src}
                        alt={image.alt || 'Image'}
                        className="w-full h-full object-contain cursor-pointer hover:opacity-80"
                        onClick={() => window.open(image.src, '_blank')}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    {image.alt && (
                      <p className="text-xs text-slate-600 p-2 truncate" title={image.alt}>
                        {image.alt}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-8 col-span-4">No images found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 mb-3">Page Metadata</h4>
              <div className="space-y-2 text-sm">
                {Object.entries(data.metadata).map(([key, value]) => (
                  value && (
                    <div key={key} className="flex justify-between">
                      <span className="text-slate-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="text-slate-900 max-w-xs truncate">{String(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {data.headings.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Headings</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {data.headings.map((heading, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm"
                      style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                    >
                      <span className="text-slate-400 mr-2">H{heading.level}</span>
                      <span className="text-slate-900">{heading.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 