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

  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-${new URL(data.url).hostname}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsText = () => {
    const textContent = `
SCRAPED WEBSITE DATA
===================

URL: ${data.url}
Title: ${data.title}
Description: ${data.description}
Scraped: ${formatDate(data.scrapedAt)}
Word Count: ${data.wordCount}
Method: ${data.method}

CONTENT:
${data.content}

HEADINGS:
${data.headings.map(h => `${'#'.repeat(h.level)} ${h.text}`).join('\n')}

LINKS (${data.links.length}):
${data.links.map(link => `- ${link.text}: ${link.href}`).join('\n')}

IMAGES (${data.images.length}):
${data.images.map(img => `- ${img.alt || 'No alt text'}: ${img.src}`).join('\n')}
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-${new URL(data.url).hostname}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'content', label: 'Content', icon: '📄' },
    { id: 'links', label: `Links (${data.links.length})`, icon: '🔗' },
    { id: 'images', label: `Images (${data.images.length})`, icon: '🖼️' },
    { id: 'metadata', label: 'Metadata', icon: '📋' },
  ] as const;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-xl">✅</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Scraping Complete</h3>
            <p className="text-sm text-gray-600">Successfully extracted content from the website</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportAsJSON}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📄 Export JSON
          </button>
          <button
            onClick={exportAsText}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            📝 Export TXT
          </button>
        </div>
      </div>

      {/* Enhanced Stats with Intelligence Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.wordCount}</div>
          <div className="text-xs text-gray-600">Words</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{data.links.length}</div>
          <div className="text-xs text-gray-600">Links</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{data.images.length}</div>
          <div className="text-xs text-gray-600">Images</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{data.headings.length}</div>
          <div className="text-xs text-gray-600">Headings</div>
        </div>
        {data.qualityScore && (
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{data.qualityScore}%</div>
            <div className="text-xs text-gray-600">Quality</div>
          </div>
        )}
        {data.completenessScore && (
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">{data.completenessScore}%</div>
            <div className="text-xs text-gray-600">Complete</div>
          </div>
        )}
      </div>

      {/* Intelligent Scraping Strategy Info */}
      {data.strategy && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900">🧠 Intelligent Scraping Strategy</h4>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              data.strategy.method === 'static' ? 'bg-green-100 text-green-800' :
              data.strategy.method === 'dynamic' ? 'bg-blue-100 text-blue-800' :
              data.strategy.method === 'stealth' ? 'bg-purple-100 text-purple-800' :
              data.strategy.method === 'adaptive' ? 'bg-indigo-100 text-indigo-800' :
              data.strategy.method === 'api' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {data.strategy.method === 'stealth' ? '🥷 STEALTH' :
               data.strategy.method === 'adaptive' ? '🧠 ADAPTIVE' :
               data.strategy.method.toUpperCase()}
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-blue-800 mb-2">
                <strong>Confidence:</strong> {data.strategy.confidence}%
              </p>
              <p className="text-blue-800">
                <strong>Time:</strong> {data.strategy.estimatedTime.toFixed(2)}s
              </p>
            </div>
            <div>
              <p className="text-blue-800 mb-1"><strong>Strategy Reasons:</strong></p>
              <ul className="text-blue-700 text-xs space-y-1">
                {data.strategy.reasons.map((reason, index) => (
                  <li key={index}>• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Advanced Strategy Details */}
          {(data.strategy.method === 'stealth' || data.strategy.method === 'adaptive') && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                {data.strategy.method === 'stealth' && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h5 className="font-medium text-purple-900 mb-2">🥷 Stealth Features Used</h5>
                    <ul className="text-purple-800 space-y-1">
                      <li>• Browser fingerprinting protection</li>
                      <li>• Human-like behavior simulation</li>
                      <li>• Anti-bot detection bypass</li>
                      <li>• Dynamic user agent rotation</li>
                    </ul>
                  </div>
                )}
                {data.strategy.method === 'adaptive' && (
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <h5 className="font-medium text-indigo-900 mb-2">🧠 Adaptive Learning</h5>
                    <ul className="text-indigo-800 space-y-1">
                      <li>• Website-specific optimization</li>
                      <li>• Success rate tracking</li>
                      <li>• Dynamic strategy selection</li>
                      <li>• Continuous improvement</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Metrics */}
      {data.performanceMetrics && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-medium text-green-900 mb-3">⚡ Performance Metrics</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-green-800">
                <strong>Total Time:</strong> {data.performanceMetrics.totalTime}ms
              </p>
              <p className="text-green-700 text-xs mt-1">
                Methods: {data.performanceMetrics.methodsAttempted.join(' → ')}
              </p>
            </div>
            {data.performanceMetrics.staticTime && (
              <div>
                <p className="text-green-800">
                  <strong>Static:</strong> {data.performanceMetrics.staticTime}ms
                </p>
              </div>
            )}
            {data.performanceMetrics.dynamicTime && (
              <div>
                <p className="text-green-800">
                  <strong>Dynamic:</strong> {data.performanceMetrics.dynamicTime}ms
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Data Summary */}
      {data.apiData && data.apiData.dataPointsExtracted > 0 && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-medium text-purple-900 mb-3">🔌 API Data Extracted</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-purple-800">
                <strong>Endpoints Found:</strong> {data.apiData.endpointsFound}
              </p>
              <p className="text-purple-800">
                <strong>Data Points:</strong> {data.apiData.dataPointsExtracted}
              </p>
            </div>
            <div>
              <p className="text-purple-800 mb-1"><strong>Structured Content:</strong></p>
              <div className="text-purple-700 text-xs space-y-1">
                {data.apiData.structuredContent.articles && data.apiData.structuredContent.articles.length > 0 && (
                  <p>• Articles: {data.apiData.structuredContent.articles.length}</p>
                )}
                {data.apiData.structuredContent.products && data.apiData.structuredContent.products.length > 0 && (
                  <p>• Products: {data.apiData.structuredContent.products.length}</p>
                )}
                {data.apiData.structuredContent.comments && data.apiData.structuredContent.comments.length > 0 && (
                  <p>• Comments: {data.apiData.structuredContent.comments.length}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Page Information</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">URL:</span>
                  <a href={data.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 truncate max-w-xs">
                    {data.url}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Title:</span>
                  <span className="text-gray-900 max-w-xs truncate">{data.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Scraped:</span>
                  <span className="text-gray-900">{formatDate(data.scrapedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="capitalize text-gray-900">{data.method}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Description</h4>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-4">
                {data.description || 'No description available'}
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Content Preview</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {data.content.substring(0, 500)}
                  {data.content.length > 500 && '...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Full Content</h4>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {data.content}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Extracted Links</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.links.length > 0 ? (
                data.links.map((link, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {link.text}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {link.href}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        link.internal 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {link.internal ? 'Internal' : 'External'}
                      </span>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <span className="sr-only">Open link</span>
                        ↗️
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No links found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Extracted Images</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {data.images.length > 0 ? (
                data.images.map((image, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="aspect-video bg-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling!.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-gray-400 text-center">
                        <span className="text-2xl">🖼️</span>
                        <p className="text-sm">Image unavailable</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {image.alt || 'No alt text'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {image.src}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8 col-span-2">No images found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Page Metadata</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                {Object.entries(data.metadata).map(([key, value]) => (
                  value && (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="text-gray-900 max-w-xs truncate">{value}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Headings Structure</h4>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                {data.headings.length > 0 ? (
                  <div className="space-y-2">
                    {data.headings.map((heading, index) => (
                      <div
                        key={index}
                        className="flex items-center"
                        style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
                      >
                        <span className="text-gray-400 mr-2">H{heading.level}</span>
                        <span className="text-gray-900 text-sm">{heading.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No headings found</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-4">Robots Compliance</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Allowed:</span>
                  <span className={data.robotsCompliance.isAllowed ? 'text-green-600' : 'text-red-600'}>
                    {data.robotsCompliance.isAllowed ? 'Yes' : 'No'}
                  </span>
                </div>
                {data.robotsCompliance.crawlDelay && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Crawl Delay:</span>
                    <span className="text-gray-900">{data.robotsCompliance.crawlDelay}s</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Robots URL:</span>
                  <a
                    href={data.robotsCompliance.robotsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 truncate max-w-xs"
                  >
                    View robots.txt
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 