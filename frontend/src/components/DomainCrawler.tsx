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
  Loader2,
  ChevronDown,
  ChevronUp,
  Brain,
  Zap
} from 'lucide-react';

interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  delay: number;
  concurrent: number;
  respectRobots: boolean;
  enableAI?: boolean; // New AI toggle
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
  images?: {
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    type: 'logo' | 'product' | 'content' | 'avatar' | 'icon' | 'unknown';
  }[];
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
    enableAI: false, // AI disabled by default
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
  const [showAIFeatures, setShowAIFeatures] = useState(false);
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
      const includeAI = config.enableAI ? '&includeAIAnalysis=true' : '';
      const response = await fetch(`http://localhost:5000/api/crawler/session/${session.sessionId}/export?format=json&includeStructuredData=true${includeAI}`);
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

  const downloadPageImages = async (page: PageResult) => {
    if (!page.images || page.images.length === 0) {
      alert('No images found on this page');
      return;
    }

    try {
      // Create a structured folder approach by downloading images as a zip
      const imageUrls = page.images.map(img => img.src);
      const pageTitle = page.title || 'page';
      const safeName = pageTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      
      // Download images one by one (simple approach)
      for (let i = 0; i < Math.min(imageUrls.length, 10); i++) {
        const imageUrl = imageUrls[i];
        const image = page.images[i];
        
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Extract file extension from URL or use jpg as default
            const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
            const fileName = `${safeName}_${i + 1}_${image.type}.${extension}`;
            
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.warn('Failed to download image:', imageUrl, err);
        }
      }
      
      if (page.images.length > 10) {
        alert(`Downloaded first 10 images. Total found: ${page.images.length}`);
      } else {
        alert(`Downloaded ${page.images.length} images successfully!`);
      }
    } catch (err) {
      console.error('Failed to download images:', err);
      alert('Failed to download images');
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
      {/* Header - Simplified */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Domain Crawler</h2>
            <p className="text-gray-600">Extract structured data from entire websites</p>
          </div>
        </div>

        {/* Simple Interface - URL + Basic Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              disabled={loading || (session?.status === 'running')}
            />
          </div>

          {/* Basic Settings Row */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pages to Crawl</label>
              <select
                value={String(config.maxPages)}
                onChange={(e) => setConfig({...config, maxPages: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={5}>5 pages</option>
                <option value={10}>10 pages</option>
                <option value={25}>25 pages</option>
                <option value={50}>50 pages</option>
                <option value={100}>100 pages</option>
                <option value={250}>250 pages</option>
                <option value={500}>500 pages</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crawl Speed</label>
              <select
                value={String(config.delay)}
                onChange={(e) => setConfig({...config, delay: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={500}>Fast (0.5s delay)</option>
                <option value={1000}>Normal (1s delay)</option>
                <option value={2000}>Slow (2s delay)</option>
                <option value={3000}>Very Slow (3s delay)</option>
              </select>
            </div>
          </div>

          {/* Start Button - Prominent */}
          <div className="pt-2">
            <button
              onClick={startCrawl}
              disabled={!url || loading}
              className="w-full md:w-auto flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              <span>{loading ? 'Starting Crawl...' : 'Start Crawling'}</span>
            </button>
          </div>

          {/* Advanced Options Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <Settings className="w-4 h-4" />
              <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="border border-gray-200 rounded-lg p-6 space-y-6 bg-gray-50">
              {/* Crawl Settings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Crawl Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Depth</label>
                    <input
                      type="number"
                      value={String(config.maxDepth)}
                      onChange={(e) => setConfig({...config, maxDepth: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Concurrent Pages</label>
                    <input
                      type="number"
                      value={String(config.concurrent)}
                      onChange={(e) => setConfig({...config, concurrent: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      max="10"
                    />
                  </div>
                  <div className="flex items-center space-x-3 pt-6">
                    <input
                      type="checkbox"
                      id="respect-robots"
                      checked={config.respectRobots}
                      onChange={(e) => setConfig({...config, respectRobots: e.target.checked})}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="respect-robots" className="text-sm text-gray-700">
                      Respect robots.txt
                    </label>
                  </div>
                </div>
              </div>

              {/* AI Features Section */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-gray-900">AI-Powered Analysis</h4>
                  <button
                    onClick={() => setShowAIFeatures(!showAIFeatures)}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    {showAIFeatures ? 'Hide' : 'Show'} AI Options
                  </button>
                </div>
                
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="enable-ai"
                    checked={config.enableAI}
                    onChange={(e) => setConfig({...config, enableAI: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="enable-ai" className="text-sm text-gray-700">
                    Enable AI content analysis and pattern recognition
                  </label>
                  <span className="text-xs text-gray-500">(Slower but smarter extraction)</span>
                </div>

                {showAIFeatures && config.enableAI && (
                  <div className="bg-white rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">AI Data Types</label>
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
                    <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                      💡 AI will automatically categorize content, extract structured data, and provide quality insights
                    </div>
                  </div>
                )}
              </div>

              {/* Authentication Settings */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Authentication</h4>
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
                      <option value="basic">HTTP Basic Auth</option>
                      <option value="form">Form-based Login</option>
                      <option value="bearer">Bearer Token</option>
                    </select>
                  </div>

                  {(config.authentication?.type === 'basic' || config.authentication?.type === 'form') && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                          type="text"
                          placeholder="Username"
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
                          placeholder="Password"
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
                        <div className="md:col-span-2">
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
                    <div className="md:col-span-2">
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
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Session Progress - Simplified */}
      {session && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Crawling Progress</h3>
          
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
              <div className="text-sm text-gray-600 mb-1">Pages</div>
              <div className="text-2xl font-bold text-gray-900">
                {progress?.processedUrls || session.stats.pagesProcessed}
                <span className="text-sm text-gray-500 ml-1">
                  / {progress?.totalUrls || session.stats.totalPages || '?'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Data Extracted</div>
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

          {/* Live Progress */}
          {(session.status === 'running' || session.status === 'pending') && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Live Progress</h4>
              
              {progress?.currentUrl && (
                <div className="mb-3">
                  <span className="text-sm text-gray-600">Currently Processing:</span>
                  <div className="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1 break-all">
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
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
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

          {/* AI Analysis Results - Only show if AI was enabled */}
          {config.enableAI && session.status === 'completed' && session.stats?.aiAnalysis && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <Brain className="w-5 h-5 mr-2 text-purple-600" />
                AI Analysis Results
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">Content Type:</span>
                  <div className="font-medium capitalize text-lg">{session.stats.aiAnalysis.primaryContentType}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">Quality Score:</span>
                  <div className="font-medium text-lg">{Math.round(session.stats.aiAnalysis.qualityScore)}/100</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">Patterns:</span>
                  <div className="font-medium text-lg">{session.stats.aiAnalysis.patternsFound}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  <span className="text-gray-600">Confidence:</span>
                  <div className="font-medium text-lg">{Math.round(session.stats.aiAnalysis.averageConfidence * 100)}%</div>
                </div>
              </div>

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

          {/* Download Options - Simplified */}
          {session.status === 'completed' && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">Download Your Data</h4>
                <button
                  onClick={loadDetailedResults}
                  disabled={loadingResults}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {loadingResults ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  <span>{loadingResults ? 'Loading...' : 'Preview Data'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <ExportButton sessionId={session.sessionId} format="json" includeAI={config.enableAI} />
                <ExportButton sessionId={session.sessionId} format="csv" includeAI={config.enableAI} />
                <ExportButton sessionId={session.sessionId} format="excel" includeAI={config.enableAI} />
                <ExportButton sessionId={session.sessionId} format="markdown" includeAI={config.enableAI} />
                <ExportButton sessionId={session.sessionId} format="multi" includeAI={config.enableAI} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Results View - Simplified */}
      {showDetailedResults && detailedResults.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Extracted Data Preview</h3>
            <button
              onClick={() => setShowDetailedResults(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {detailedResults.slice(0, 10).map((page, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Page Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{page.metadata.title || page.title}</h4>
                    <p className="text-sm text-blue-600 mb-2 break-all">{page.url}</p>
                    {page.metadata.description && (
                      <p className="text-sm text-gray-600">{page.metadata.description.slice(0, 150)}...</p>
                    )}
                  </div>
                  {config.enableAI && page.metadata.aiContentType && (
                    <div className="ml-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        page.metadata.aiContentType === 'product' ? 'bg-green-100 text-green-800' :
                        page.metadata.aiContentType === 'article' ? 'bg-blue-100 text-blue-800' :
                        page.metadata.aiContentType === 'contact' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {page.metadata.aiContentType}
                      </span>
                    </div>
                  )}
                </div>

                {/* Structured Data Preview */}
                {page.metadata.structuredData && Object.keys(page.metadata.structuredData).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h5 className="font-medium text-gray-900 mb-2">📊 Extracted Data</h5>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      {Object.entries(page.metadata.structuredData)
                        .filter(([key, value]) => value && value !== '')
                        .slice(0, 4)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium text-gray-700 capitalize">{key}:</span>
                            <span className="ml-2 text-gray-600">
                              {Array.isArray(value) ? value.slice(0, 2).join(', ') : String(value).slice(0, 80)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Images Preview */}
                {page.images && page.images.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">🖼️ Images ({page.images.length})</h5>
                      <button
                        onClick={() => downloadPageImages(page)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Download All
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {page.images.slice(0, 8).map((image, imgIndex) => (
                        <div key={imgIndex} className="relative group">
                          <img
                            src={image.src}
                            alt={image.alt || 'Image'}
                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => window.open(image.src, '_blank')}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b opacity-0 group-hover:opacity-100 transition-opacity">
                            {image.type}
                          </div>
                        </div>
                      ))}
                    </div>
                    {page.images.length > 8 && (
                      <div className="text-xs text-gray-500 mt-2">
                        ... and {page.images.length - 8} more images
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {detailedResults.length > 10 && (
              <div className="text-center py-4 text-gray-500">
                Showing first 10 results. Download files for complete data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export Button Component - Updated to handle AI inclusion
function ExportButton({ sessionId, format, includeAI = false }: { sessionId: string; format: string; includeAI?: boolean }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      let url = `http://localhost:5000/api/crawler/session/${sessionId}/export?`;
      
      const aiParam = includeAI ? '&includeAIAnalysis=true' : '';
      
      if (format === 'multi') {
        url += `multiFormat=true&includeStructuredData=true${aiParam}`;
      } else {
        url += `format=${format}&includeStructuredData=true${aiParam}`;
      }

      console.log('Export URL:', url); // Debug log

      const response = await fetch(url);
      console.log('Export response status:', response.status); // Debug log
      
      if (response.ok) {
        const data = await response.json();
        console.log('Export response data:', data); // Debug log
        
        if (data.success && data.data.downloadUrl) {
          const downloadUrl = `http://localhost:5000${data.data.downloadUrl}`;
          console.log('Download URL:', downloadUrl); // Debug log
          
          // Try direct download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = data.data.fileName || 'export';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          console.error('Export failed:', data);
          throw new Error(data.message || 'Export failed');
        }
      } else {
        const errorText = await response.text();
        console.error('Export request failed:', response.status, errorText);
        throw new Error(`Export failed: ${response.status} ${errorText}`);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
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
      case 'markdown':
        return <FileText className="w-4 h-4" />;
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
      case 'markdown':
        return 'Markdown';
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
      className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : getIcon()}
      <span className="text-sm font-medium">{exporting ? 'Exporting...' : getLabel()}</span>
    </button>
  );
} 