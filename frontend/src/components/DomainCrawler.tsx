'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, 
  Play, 
  Pause, 
  Square, 
  Download, 
  Settings, 
  Database,
  FileText,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  delay: number;
  concurrent: number;
  respectRobots: boolean;
  authentication?: {
    type: 'none' | 'basic' | 'form' | 'bearer' | 'cookie';
    credentials?: {
      username?: string;
      password?: string;
      token?: string;
      loginUrl?: string;
    };
  };
  extraction: {
    enableStructuredData: boolean;
    dataTypes: string[];
    qualityThreshold: number;
  };
}

interface CrawlSession {
  sessionId: string;
  domain: string;
  startUrl: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  config: CrawlConfig;
  stats: {
    pagesProcessed: number;
    totalPages: number;
    extractedItems: number;
    startTime: string;
    endTime?: string;
    aiAnalysis?: {
      primaryContentType: string;
      qualityScore: number;
      patternsFound: number;
      averageConfidence: number;
      analyzedPages: number;
      contentTypes: { [key: string]: number };
      recommendations: string[];
    };
  };
}

interface PageResult {
  url: string;
  title: string;
  description: string;
  processingStatus: string;
  metadata: {
    title: string;
    description: string;
    aiContentType?: string;
    confidence?: number;
    relevanceScore?: number;
    structuredData?: any;
    aiAnalysis?: {
      patterns: number;
      extractedFields: number;
      reasoning: string;
    };
  };
  contentChunks?: any[];
  extractedLinks?: any;
  createdAt: string;
}

export default function DomainCrawler() {
  const [url, setUrl] = useState('');
  const [config, setConfig] = useState<CrawlConfig>({
    maxPages: 50,
    maxDepth: 3,
    delay: 1000,
    concurrent: 3,
    respectRobots: true,
    authentication: {
      type: 'none'
    },
    extraction: {
      enableStructuredData: true,
      dataTypes: ['product', 'article', 'contact'],
      qualityThreshold: 0.7
    }
  });
  
  const [session, setSession] = useState<CrawlSession | null>(null);
  const [sessions, setSessions] = useState<CrawlSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [detailedResults, setDetailedResults] = useState<PageResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Polling effect for real-time updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    const pollProgress = async () => {
      if (!session || (session.status === 'completed' || session.status === 'failed')) {
        return;
      }

      try {
        // Get current session status
        const statusResponse = await fetch(`http://localhost:5000/api/crawler/session/${session.sessionId}/status`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success) {
            const updatedSession = statusData.data.session;
            setSession(prevSession => ({
              ...prevSession!,
              status: updatedSession.status,
              stats: updatedSession.stats
            }));

            // Get progress data
            const progressResponse = await fetch(`http://localhost:5000/api/crawler/session/${session.sessionId}/progress`);
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (progressData.success) {
                setProgress(progressData.data);
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to poll progress:', error);
      }
    };

    // Start polling if session exists and is active
    if (session && (session.status === 'pending' || session.status === 'running')) {
      pollInterval = setInterval(pollProgress, 2000); // Poll every 2 seconds
      
      // Initial poll
      pollProgress();
    }

    // Cleanup
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [session?.sessionId, session?.status]);

  const startCrawl = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setShowDetailedResults(false);
    setDetailedResults([]);

    try {
      const response = await fetch('http://localhost:5000/api/crawler/start-domain-crawl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, config }),
      });

      if (!response.ok) {
        throw new Error('Failed to start crawl');
      }

      const data = await response.json();
      
      const newSession: CrawlSession = {
        sessionId: data.data.sessionId,
        domain: new URL(url).hostname,
        startUrl: url,
        status: 'pending',
        config,
        stats: {
          pagesProcessed: 0,
          totalPages: 0,
          extractedItems: 0,
          startTime: new Date().toISOString()
        }
      };
      
      setSession(newSession);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedResults = async () => {
    if (!session) return;
    
    setLoadingResults(true);
    try {
      const response = await fetch(`http://localhost:5000/api/crawler/session/${session.sessionId}/export?format=json&includeStructuredData=true&includeAIAnalysis=true`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.downloadUrl) {
          // Download and parse the export data
          const exportResponse = await fetch(`http://localhost:5000${data.data.downloadUrl}`);
          const exportData = await exportResponse.json();
          setDetailedResults(exportData.content || []);
          setShowDetailedResults(true);
        }
      }
    } catch (err) {
      console.error('Failed to load detailed results:', err);
    } finally {
      setLoadingResults(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Domain Crawler</h2>
            <p className="text-gray-600">Crawl entire websites with AI-powered content extraction</p>
          </div>
        </div>

        {/* URL Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Domain
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading || (session?.status === 'running')}
            />
          </div>

          {/* Quick Config */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Pages</label>
              <input
                type="number"
                value={String(config.maxPages)}
                onChange={(e) => setConfig({...config, maxPages: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="1"
                max="1000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Depth</label>
              <input
                type="number"
                value={String(config.maxDepth)}
                onChange={(e) => setConfig({...config, maxDepth: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delay (ms)</label>
              <input
                type="number"
                value={String(config.delay)}
                onChange={(e) => setConfig({...config, delay: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min="500"
                max="10000"
                step="500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quality</label>
              <select
                value={String(config.extraction.qualityThreshold)}
                onChange={(e) => setConfig({
                  ...config, 
                  extraction: { ...config.extraction, qualityThreshold: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={0.5}>Low (0.5)</option>
                <option value={0.7}>Medium (0.7)</option>
                <option value={0.8}>High (0.8)</option>
                <option value={0.9}>Very High (0.9)</option>
              </select>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-sm text-purple-600 hover:text-purple-700"
          >
            <Settings className="w-4 h-4" />
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-900">Authentication Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auth Type</label>
                  <select
                    value={config.authentication?.type || 'none'}
                    onChange={(e) => setConfig({
                      ...config,
                      authentication: { 
                        type: e.target.value as 'none' | 'basic' | 'form' | 'bearer' | 'cookie',
                        credentials: config.authentication?.credentials
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="none">No Authentication</option>
                    <option value="basic">HTTP Basic Auth (Server popup)</option>
                    <option value="form">Form-based Login (Login page)</option>
                    <option value="bearer">Bearer Token</option>
                  </select>
                  {config.authentication?.type === 'basic' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Use this for sites that show a browser authentication popup
                    </p>
                  )}
                  {config.authentication?.type === 'form' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Use this for sites with login forms on a webpage
                    </p>
                  )}
                </div>

                {(config.authentication?.type === 'basic' || config.authentication?.type === 'form') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input
                        type="text"
                        placeholder={config.authentication?.type === 'basic' ? 'Basic Auth Username' : 'Username'}
                        value={config.authentication?.credentials?.username || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        onChange={(e) => setConfig({
                          ...config,
                          authentication: {
                            type: config.authentication?.type || 'form',
                            credentials: { ...config.authentication?.credentials, username: e.target.value }
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        placeholder={config.authentication?.type === 'basic' ? 'Basic Auth Password' : 'Password'}
                        value={config.authentication?.credentials?.password || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        onChange={(e) => setConfig({
                          ...config,
                          authentication: {
                            type: config.authentication?.type || 'form',
                            credentials: { ...config.authentication?.credentials, password: e.target.value }
                          }
                        })}
                      />
                    </div>
                    {config.authentication?.type === 'form' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Login URL</label>
                        <input
                          type="url"
                          placeholder="https://example.com/login"
                          value={config.authentication?.credentials?.loginUrl || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          onChange={(e) => setConfig({
                            ...config,
                            authentication: {
                              type: config.authentication?.type || 'form',
                              credentials: { ...config.authentication?.credentials, loginUrl: e.target.value }
                            }
                          })}
                        />
                      </div>
                    )}
                  </>
                )}

                {config.authentication?.type === 'bearer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bearer Token</label>
                    <input
                      type="text"
                      placeholder="Your bearer token"
                      value={config.authentication?.credentials?.token || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      onChange={(e) => setConfig({
                        ...config,
                        authentication: {
                          type: 'bearer',
                          credentials: { ...config.authentication?.credentials, token: e.target.value }
                        }
                      })}
                    />
                  </div>
                )}
              </div>

              <h4 className="font-medium text-gray-900 pt-4">Extraction Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="structured-data"
                    checked={config.extraction.enableStructuredData}
                    onChange={(e) => setConfig({
                      ...config,
                      extraction: { ...config.extraction, enableStructuredData: e.target.checked }
                    })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="structured-data" className="text-sm text-gray-700">
                    Enable structured data extraction
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Types</label>
                  <div className="flex flex-wrap gap-2">
                    {['product', 'article', 'contact', 'event', 'job', 'generic'].map(type => (
                      <label key={type} className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={config.extraction.dataTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig({
                                ...config,
                                extraction: {
                                  ...config.extraction,
                                  dataTypes: [...config.extraction.dataTypes, type]
                                }
                              });
                            } else {
                              setConfig({
                                ...config,
                                extraction: {
                                  ...config.extraction,
                                  dataTypes: config.extraction.dataTypes.filter(t => t !== type)
                                }
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={startCrawl}
              disabled={!url || loading}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{loading ? 'Starting...' : 'Start Crawl'}</span>
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Session Progress */}
      {session && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Session</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Status</span>
                {getStatusIcon(session.status)}
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Pages Processed</div>
              <div className="text-2xl font-bold text-gray-900">
                {progress?.processedUrls || session.stats.pagesProcessed}
                <span className="text-sm text-gray-500 ml-1">
                  / {progress?.totalUrls || session.stats.totalPages || '?'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Items Extracted</div>
              <div className="text-2xl font-bold text-gray-900">
                {progress?.extractedItems || session.stats.extractedItems}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Domain</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {session.domain}
              </div>
            </div>
          </div>

          {/* Current URL and Progress Details */}
          {(session.status === 'running' || session.status === 'pending') && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Live Progress</h4>
              
              {progress?.currentUrl && (
                <div className="mb-3">
                  <span className="text-sm text-gray-600">Currently Processing:</span>
                  <div className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 break-all">
                    {progress.currentUrl}
                  </div>
                </div>
              )}

              {progress?.totalUrls > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((progress.processedUrls / progress.totalUrls) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((progress.processedUrls / progress.totalUrls) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {progress?.failedUrls > 0 && (
                <div className="text-sm text-red-600">
                  ⚠️ {progress.failedUrls} URLs failed
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Results - Enhanced with explanations */}
          {session.status === 'completed' && session.stats?.aiAnalysis && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">🤖</span>
                AI Content Analysis Results
              </h4>
              
              {/* AI Explanation Panel */}
              <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                <h5 className="font-medium text-purple-900 mb-3">🧠 What AI Analyzed</h5>
                <div className="text-sm text-purple-800 space-y-2">
                  <p>• <strong>Content Classification:</strong> AI identified {session.stats.aiAnalysis.analyzedPages} pages and categorized them by type</p>
                  <p>• <strong>Quality Assessment:</strong> Each page was scored based on content depth, relevance, and structure</p>
                  <p>• <strong>Pattern Recognition:</strong> AI found {session.stats.aiAnalysis.patternsFound} recurring patterns across your domain</p>
                  <p>• <strong>Data Extraction:</strong> Automatically extracted structured information like prices, contacts, dates, etc.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">Primary Content:</span>
                  <div className="font-medium capitalize text-lg">{session.stats.aiAnalysis.primaryContentType}</div>
                  <div className="text-xs text-gray-500">Most common page type</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">Quality Score:</span>
                  <div className="font-medium text-lg">{Math.round(session.stats.aiAnalysis.qualityScore)}/100</div>
                  <div className="text-xs text-gray-500">Overall content quality</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">Patterns Found:</span>
                  <div className="font-medium text-lg">{session.stats.aiAnalysis.patternsFound}</div>
                  <div className="text-xs text-gray-500">Recurring structures</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">AI Confidence:</span>
                  <div className="font-medium text-lg">{Math.round(session.stats.aiAnalysis.averageConfidence * 100)}%</div>
                  <div className="text-xs text-gray-500">Analysis accuracy</div>
                </div>
              </div>

              {/* Content Types Breakdown */}
              {session.stats.aiAnalysis.contentTypes && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                  <h5 className="font-medium text-purple-900 mb-3">📊 Content Types Distribution</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(session.stats.aiAnalysis.contentTypes).map(([type, count]) => (
                      <div key={type} className="text-center p-2 bg-purple-50 rounded">
                        <div className="text-lg font-bold text-purple-700">{count}</div>
                        <div className="text-xs text-purple-600 capitalize">{type} pages</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations */}
              {session.stats.aiAnalysis.recommendations && session.stats.aiAnalysis.recommendations.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <h5 className="font-medium text-purple-900 mb-3">💡 AI Recommendations</h5>
                  <ul className="text-sm text-purple-800 space-y-1">
                    {session.stats.aiAnalysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-purple-500 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Session Actions */}
          {session.status === 'completed' && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Export & Analysis Options</h4>
                <button
                  onClick={loadDetailedResults}
                  disabled={loadingResults}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingResults ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  <span>{loadingResults ? 'Loading...' : 'View Page Details'}</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <ExportButton sessionId={session.sessionId} format="json" />
                <ExportButton sessionId={session.sessionId} format="csv" />
                <ExportButton sessionId={session.sessionId} format="excel" />
                <ExportButton sessionId={session.sessionId} format="multi" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Results View */}
      {showDetailedResults && detailedResults.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">📄 Individual Page Analysis</h3>
            <button
              onClick={() => setShowDetailedResults(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {detailedResults.map((page, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                {/* Page Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{page.metadata.title || page.title}</h4>
                    <p className="text-sm text-blue-600 mb-2 break-all">{page.url}</p>
                    {page.metadata.description && (
                      <p className="text-sm text-gray-600">{page.metadata.description}</p>
                    )}
                  </div>
                  <div className="ml-4 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      page.metadata.aiContentType === 'product' ? 'bg-green-100 text-green-800' :
                      page.metadata.aiContentType === 'article' ? 'bg-blue-100 text-blue-800' :
                      page.metadata.aiContentType === 'contact' ? 'bg-purple-100 text-purple-800' :
                      page.metadata.aiContentType === 'listing' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {page.metadata.aiContentType || 'unknown'}
                    </span>
                  </div>
                </div>

                {/* AI Analysis Stats */}
                {page.metadata.aiAnalysis && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{Math.round((page.metadata.confidence || 0) * 100)}%</div>
                      <div className="text-xs text-gray-600">AI Confidence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{Math.round((page.metadata.relevanceScore || 0) * 100)}%</div>
                      <div className="text-xs text-gray-600">Relevance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{page.metadata.aiAnalysis.patterns || 0}</div>
                      <div className="text-xs text-gray-600">Patterns</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">{page.metadata.aiAnalysis.extractedFields || 0}</div>
                      <div className="text-xs text-gray-600">Data Fields</div>
                    </div>
                  </div>
                )}

                {/* Structured Data Preview */}
                {page.metadata.structuredData && Object.keys(page.metadata.structuredData).length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">🔍 Extracted Data</h5>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        {Object.entries(page.metadata.structuredData)
                          .filter(([key, value]) => value && value !== '')
                          .slice(0, 6)
                          .map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium text-gray-700 capitalize">{key}:</span>
                              <span className="ml-2 text-gray-600">
                                {Array.isArray(value) ? value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : '') : String(value).slice(0, 100)}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Reasoning */}
                {page.metadata.aiAnalysis?.reasoning && (
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">🤖 AI Analysis</h5>
                    <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded-lg italic">
                      "{page.metadata.aiAnalysis.reasoning}"
                    </p>
                  </div>
                )}

                {/* Content Preview */}
                {page.contentChunks && page.contentChunks.length > 0 && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">📝 Content Preview</h5>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {page.contentChunks.slice(0, 3).map((chunk, i) => (
                        <div key={i} className="mb-2 last:mb-0">
                          <span className="font-medium capitalize">{chunk.type}:</span>
                          <span className="ml-2">{chunk.content.slice(0, 150)}...</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export Button Component
function ExportButton({ sessionId, format }: { sessionId: string; format: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      let url = `http://localhost:5000/api/crawler/session/${sessionId}/export?`;
      
      if (format === 'multi') {
        url += 'multiFormat=true&includeStructuredData=true&includeAIAnalysis=true';
      } else {
        url += `format=${format}&includeStructuredData=true&includeAIAnalysis=true`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.downloadUrl) {
          window.open(`http://localhost:5000${data.data.downloadUrl}`, '_blank');
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const getIcon = () => {
    switch (format) {
      case 'json':
        return <FileText className="w-4 h-4" />;
      case 'csv':
        return <BarChart3 className="w-4 h-4" />;
      case 'excel':
        return <Database className="w-4 h-4" />;
      case 'multi':
        return <Download className="w-4 h-4" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (format) {
      case 'json':
        return 'JSON';
      case 'csv':
        return 'CSV';
      case 'excel':
        return 'Excel';
      case 'multi':
        return 'All Formats';
      default:
        return format.toUpperCase();
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : getIcon()}
      <span className="text-sm">{exporting ? 'Exporting...' : getLabel()}</span>
    </button>
  );
} 