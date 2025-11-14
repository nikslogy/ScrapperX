'use client';

import { useState, useEffect } from 'react';
import { 
  Globe,
  Play, 
  Settings, 
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { exportSession, startDomainCrawl } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
  // Scraping mode options (same as quick scraper)
  forceMethod?: 'static' | 'dynamic' | 'stealth' | 'adaptive' | 'api';
  enableApiScraping?: boolean;
  enableDynamicScraping?: boolean;
  enableStealthScraping?: boolean;
  enableAdaptiveScraping?: boolean;
  captchaSolver?: 'manual' | '2captcha' | 'anticaptcha' | 'skip';
  captchaApiKey?: string;
  stealthLevel?: 'basic' | 'advanced' | 'maximum';
  learningMode?: boolean;
}

interface CrawlSession {
  sessionId: string;
  domain: string;
  startUrl: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  config: CrawlConfig;
  stats: {
    processedUrls: number;
    totalUrls: number;
    failedUrls: number;
    extractedItems: number;
    startTime: string;
    endTime?: string;
  };
}

interface PageResult {
  url: string;
  title: string;
  description: string;
  content?: string; // Full page content
  processingStatus: string;
  metadata: {
    title: string;
    description: string;
    structuredData?: any;
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
    maxPages: 5,
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
    },
    // Scraping mode defaults (same as quick scraper)
    enableStealthScraping: true,
    enableAdaptiveScraping: true,
    enableApiScraping: true,
    enableDynamicScraping: true,
    captchaSolver: 'skip',
    stealthLevel: 'advanced',
    learningMode: true
  });
  
  const [session, setSession] = useState<CrawlSession | null>(null);
  const [sessions, setSessions] = useState<CrawlSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [detailedResults, setDetailedResults] = useState<PageResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [expandedImages, setExpandedImages] = useState<{ [key: number]: boolean }>({});
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<{ [key: number]: 'overview' | 'content' | 'links' | 'images' | 'metadata' }>({});
  const [isCrawling, setIsCrawling] = useState(false);

  // Polling effect for real-time updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    
    const pollProgress = async () => {
      if (!session || (session.status === 'completed' || session.status === 'failed')) {
        setIsCrawling(false);
        return;
      }

      try {
        // Get current session status
        const statusResponse = await fetch(`${API_BASE_URL}/api/crawler/session/${session.sessionId}/status`);
        
        if (statusResponse.status === 429) {
          // Rate limited, just skip this poll
          console.warn('Rate limited, skipping poll');
          return;
        }
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success) {
            const updatedSession = statusData.data.session;
            console.log('Session update:', {
              status: updatedSession.status,
              stats: updatedSession.stats
            }); // Debug log
            
            setSession(prevSession => ({
              ...prevSession!,
              status: updatedSession.status,
              stats: updatedSession.stats
            }));

            // Update crawling state
            if (updatedSession.status === 'completed' || updatedSession.status === 'failed') {
              console.log(`Crawl ${updatedSession.status}. Processed: ${updatedSession.stats.processedUrls}`); // Debug log
              setIsCrawling(false);
              if (updatedSession.status === 'failed') {
                setError('Crawl failed. Please check the session details for errors.');
              }
            }

            // Get progress data
            const progressResponse = await fetch(`${API_BASE_URL}/api/crawler/session/${session.sessionId}/progress`);
            if (progressResponse.ok) {
              const progressData = await progressResponse.json();
              if (progressData.success) {
                setProgress(progressData.data);
              }
            }
          }
        } else {
          const errorData = await statusResponse.json().catch(() => ({ message: 'Failed to fetch status' }));
          console.error('Status check failed:', errorData);
        }
      } catch (error) {
        console.warn('Failed to poll progress:', error);
      }
    };

    // Start polling if session exists and is active
    if (session && (session.status === 'pending' || session.status === 'running')) {
      setIsCrawling(true);
      pollInterval = setInterval(pollProgress, 3000); // Poll every 3 seconds (reduced from 2)
      
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

  // Auto-load results when session completes
  useEffect(() => {
    if (session?.status === 'completed' && detailedResults.length === 0 && !loadingResults) {
      console.log('Auto-loading results for completed session:', session.sessionId); // Debug log
      loadDetailedResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.sessionId]);

  const startCrawl = async () => {
    // Prevent starting a new crawl if one is already running
    if (isCrawling) {
      setError('A crawl is already in progress. Please wait or stop the current crawl.');
      return;
    }

    if (!url) {
      setError('Please enter a URL');
      return;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }

    setLoading(true);
    setError(null);
    setDetailedResults([]);
    setIsCrawling(true);

    try {
      const response = await startDomainCrawl(url, config);
      
      if (!response.success) {
        // Check if it's a MongoDB error
        if (response.message && response.message.includes('MongoDB')) {
          throw new Error('Database not configured. The domain crawler requires MongoDB to be set up on the server. Please contact the administrator or use the Quick Scrape feature instead.');
        }
        throw new Error(response.message || 'Failed to start crawl');
      }

      const newSession: CrawlSession = {
        sessionId: response.data.sessionId,
        domain: new URL(url).hostname,
        startUrl: url,
        status: 'pending',
        config,
        stats: {
          processedUrls: 0,
          totalUrls: 0,
          failedUrls: 0,
          extractedItems: 0,
          startTime: new Date().toISOString()
        }
      };
      
      setSession(newSession);
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to start crawl. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
        errorMessage = 'Domain crawler service is currently unavailable. MongoDB database is not configured. Please try the Quick Scrape feature instead.';
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        errorMessage = 'Server error occurred. The database might not be properly configured. Please contact the administrator.';
      }
      
      setError(errorMessage);
      setIsCrawling(false);
    } finally {
      setLoading(false);
    }
  };

  const stopCrawl = async () => {
    if (!session) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/session/${session.sessionId}/stop`, {
        method: 'POST'
      });

      if (response.ok) {
        setSession(prev => prev ? { ...prev, status: 'failed' } : null);
        setIsCrawling(false);
        setError('Crawl stopped by user');
      } else {
        throw new Error('Failed to stop crawl');
      }
    } catch (err) {
      console.error('Failed to stop crawl:', err);
      setError('Failed to stop crawl. It may complete on its own.');
    }
  };

  const loadDetailedResults = async () => {
    if (!session) return;
    
    setLoadingResults(true);
    try {
      // Use the direct content API endpoint instead of export
      const response = await fetch(`${API_BASE_URL}/api/crawler/session/${session.sessionId}/content?limit=1000`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch content:', response.status, errorText);
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received crawl results:', data); // Debug log
      
      if (data.success && data.data && data.data.content) {
        console.log(`Found ${data.data.content.length} pages in results`); // Debug log
        
        // Transform the data to match PageResult interface
        const transformedResults: PageResult[] = data.data.content.map((item: any) => ({
          url: item.url,
          title: item.metadata?.title || '',
          description: item.metadata?.description || '',
          content: item.textContent || item.markdownContent || '',
          processingStatus: item.processingStatus || 'raw',
          metadata: {
            title: item.metadata?.title || '',
            description: item.metadata?.description || '',
            structuredData: item.metadata?.structuredData || {}
          },
          contentChunks: item.contentChunks || [],
          extractedLinks: item.extractedLinks || { internal: [], external: [] },
          images: item.images || [],
          createdAt: item.createdAt || new Date().toISOString()
        }));
        
        console.log(`Transformed ${transformedResults.length} results`); // Debug log
        setDetailedResults(transformedResults);
        
        if (transformedResults.length === 0) {
          setError('No content was extracted. The crawler may have encountered errors or the pages may be blocking scraping.');
        }
      } else {
        console.error('Unexpected response structure:', data);
        throw new Error('No content data received');
      }
    } catch (err) {
      console.error('Failed to load detailed results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
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
        return <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'paused':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-slate-100 text-slate-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Main Input Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g., https://example.com)..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all text-slate-900 placeholder-slate-400 disabled:bg-slate-100 disabled:cursor-not-allowed"
              disabled={loading || isCrawling}
            />
          </div>

          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Pages</label>
              <select
                value={String(config.maxPages)}
                onChange={(e) => setConfig({...config, maxPages: parseInt(e.target.value)})}
                disabled={isCrawling}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Speed</label>
              <select
                value={String(config.delay)}
                onChange={(e) => setConfig({...config, delay: parseInt(e.target.value)})}
                disabled={isCrawling}
                className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value={500}>Fast</option>
                <option value={1000}>Normal</option>
                <option value={2000}>Slow</option>
              </select>
            </div>
          </div>

          {/* Start/Stop Buttons */}
          <div className="flex gap-3">
            {!isCrawling ? (
              <button
                onClick={startCrawl}
                disabled={!url || loading}
                className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Start Crawling</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={stopCrawl}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="6" width="8" height="8" />
                </svg>
                <span>Stop Crawling</span>
              </button>
            )}
          </div>

          {/* Crawling Status Animation */}
          {isCrawling && session && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  <div className="absolute inset-0 animate-ping">
                    <Globe className="w-6 h-6 text-blue-400 opacity-20" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Crawling in progress...</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {progress?.currentUrl ? `Currently scraping: ${progress.currentUrl}` : 'Initializing crawler...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Advanced Options</span>
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4 border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Max Depth</label>
                  <input
                    type="number"
                    value={String(config.maxDepth)}
                    onChange={(e) => setConfig({...config, maxDepth: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Concurrent</label>
                  <input
                    type="number"
                    value={String(config.concurrent)}
                    onChange={(e) => setConfig({...config, concurrent: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={config.respectRobots}
                  onChange={(e) => setConfig({...config, respectRobots: e.target.checked})}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span>Respect robots.txt</span>
              </label>

              {/* Authentication Settings */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Authentication</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Auth Type</label>
                    <select
                      value={config.authentication?.type || 'none'}
                      onChange={(e) => setConfig({
                        ...config,
                        authentication: { 
                          type: e.target.value as 'none' | 'basic' | 'form' | 'bearer' | 'cookie',
                          credentials: config.authentication?.credentials
                        }
                      })}
                      className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                    >
                      <option value="none">None</option>
                      <option value="basic">Basic Auth</option>
                      <option value="form">Form Login</option>
                      <option value="bearer">Bearer Token</option>
                    </select>
                  </div>

                  {(config.authentication?.type === 'basic' || config.authentication?.type === 'form') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Username</label>
                        <input
                          type="text"
                          placeholder="Username"
                          value={config.authentication?.credentials?.username || ''}
                          className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
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
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
                        <input
                          type="password"
                          placeholder="Password"
                          value={config.authentication?.credentials?.password || ''}
                          className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
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
                          <label className="block text-xs font-medium text-slate-700 mb-1.5">Login URL</label>
                          <input
                            type="url"
                            placeholder="https://example.com/login"
                            value={config.authentication?.credentials?.loginUrl || ''}
                            className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
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
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Bearer Token</label>
                      <input
                        type="text"
                        placeholder="Your bearer token"
                        value={config.authentication?.credentials?.token || ''}
                        className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
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

              {/* Scraping Mode Settings */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Scraping Mode</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Force Method</label>
                    <select
                      value={config.forceMethod || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        forceMethod: (e.target.value || undefined) as any
                      })}
                      className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                    >
                      <option value="">Auto (Adaptive)</option>
                      <option value="static">Static</option>
                      <option value="dynamic">Dynamic</option>
                      <option value="stealth">Stealth</option>
                      <option value="adaptive">Adaptive</option>
                      <option value="api">API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Stealth Level</label>
                    <select
                      value={config.stealthLevel || 'advanced'}
                      onChange={(e) => setConfig({
                        ...config,
                        stealthLevel: e.target.value as 'basic' | 'advanced' | 'maximum'
                      })}
                      className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                    >
                      <option value="basic">Basic</option>
                      <option value="advanced">Advanced</option>
                      <option value="maximum">Maximum</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.enableStealthScraping ?? true}
                      onChange={(e) => setConfig({...config, enableStealthScraping: e.target.checked})}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Enable Stealth Scraping</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.enableAdaptiveScraping ?? true}
                      onChange={(e) => setConfig({...config, enableAdaptiveScraping: e.target.checked})}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Enable Adaptive Scraping</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.enableDynamicScraping ?? true}
                      onChange={(e) => setConfig({...config, enableDynamicScraping: e.target.checked})}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Enable Dynamic Scraping</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.enableApiScraping ?? true}
                      onChange={(e) => setConfig({...config, enableApiScraping: e.target.checked})}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Enable API Scraping</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.learningMode ?? true}
                      onChange={(e) => setConfig({...config, learningMode: e.target.checked})}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <span>Learning Mode</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Error</h4>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Card */}
      {session && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Progress</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-xs text-slate-600 mb-1">Pages</div>
              <div className="text-xl font-bold text-slate-900">
                {progress?.processedUrls || session.stats.processedUrls || 0}
                <span className="text-sm text-slate-500 ml-1">/ {progress?.totalUrls || session.stats.totalUrls || '?'}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Extracted</div>
              <div className="text-xl font-bold text-slate-900">
                {progress?.extractedItems || session.stats.extractedItems}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600 mb-1">Domain</div>
              <div className="text-sm font-medium text-slate-900 truncate">
                {session.domain}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {(session.status === 'running' || session.status === 'pending') && progress?.totalUrls > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-600 mb-2">
                <span>Processing...</span>
                <span>{Math.round((progress.processedUrls / progress.totalUrls) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-slate-900 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((progress.processedUrls / progress.totalUrls) * 100)}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Download Button */}
          {session.status === 'completed' && (
            <div className="pt-4 border-t border-slate-200">
              <ExportButton sessionId={session.sessionId} format="markdown" />
            </div>
          )}
        </div>
      )}

      {/* Loading Results */}
      {session?.status === 'completed' && loadingResults && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-600 mr-3" />
            <span className="text-slate-600">Loading results...</span>
          </div>
        </div>
      )}

      {/* Results View */}
      {session?.status === 'completed' && !loadingResults && detailedResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Results</h3>
            <span className="text-sm text-slate-500">{detailedResults.length} pages</span>
          </div>

          <div className="space-y-4">
            {detailedResults.map((page, index) => {
              const currentTab = activeTab[index] || 'overview';
              const pageLinks = Array.isArray(page.extractedLinks) 
                ? page.extractedLinks 
                : [...(page.extractedLinks?.internal || []), ...(page.extractedLinks?.external || [])];
              
              const tabs = [
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'content', label: 'Content', icon: '📄' },
                { id: 'links', label: `Links (${pageLinks.length})`, icon: '🔗' },
                { id: 'images', label: `Images (${page.images?.length || 0})`, icon: '🖼️' },
                { id: 'metadata', label: 'Metadata', icon: '📋' },
              ] as const;
              
              return (
                <div key={index} className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="mb-4">
                    <h4 className="font-medium text-slate-900 mb-1">{page.metadata.title || page.title}</h4>
                    <p className="text-xs text-slate-500 break-all">{page.url}</p>
                  </div>

                  {/* Tab Navigation */}
                  <div className="border-b border-slate-200 mb-4">
                    <nav className="flex space-x-4" aria-label="Tabs">
                      {tabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(prev => ({ ...prev, [index]: tab.id }))}
                          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            currentTab === tab.id
                              ? 'border-slate-900 text-slate-900'
                              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span className="mr-1">{tab.icon}</span>
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[300px]">
                    {currentTab === 'overview' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-slate-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-slate-900">{page.content?.length || 0}</div>
                            <div className="text-xs text-slate-600 mt-1">Characters</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-slate-900">{pageLinks.length}</div>
                            <div className="text-xs text-slate-600 mt-1">Links</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-slate-900">{page.images?.length || 0}</div>
                            <div className="text-xs text-slate-600 mt-1">Images</div>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-slate-900">
                              {page.metadata.structuredData ? Object.keys(page.metadata.structuredData).length : 0}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">Data Fields</div>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-3">
                          <h5 className="font-medium text-slate-900 mb-2">Page Info</h5>
                          <div className="space-y-1 text-sm">
                            {page.metadata.description && (
                              <div><span className="text-slate-600">Description:</span> <span className="text-slate-900">{page.metadata.description}</span></div>
                            )}
                            <div><span className="text-slate-600">URL:</span> <a href={page.url} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:underline">{page.url}</a></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {currentTab === 'content' && (
                      <div>
                        {page.content ? (
                          <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {page.content}
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">No content available</p>
                        )}
                      </div>
                    )}

                    {currentTab === 'links' && (
                      <div>
                        {pageLinks.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {pageLinks.map((link, linkIndex) => (
                              <div key={linkIndex} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {link}
                                  </p>
                                </div>
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-600 hover:text-slate-900 ml-2"
                                >
                                  ↗️
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">No links found</p>
                        )}
                      </div>
                    )}

                    {currentTab === 'images' && (
                      <div>
                        {page.images && page.images.length > 0 ? (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-slate-700">{page.images.length} images</span>
                              <button
                                onClick={() => downloadPageImages(page)}
                                className="text-xs px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800"
                              >
                                Download All
                              </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                              {page.images.map((image, imgIndex) => (
                                <div key={imgIndex} className="bg-slate-50 rounded-lg overflow-hidden">
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
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-center py-8">No images found</p>
                        )}
                      </div>
                    )}

                    {currentTab === 'metadata' && (
                      <div className="space-y-4">
                        {page.metadata.structuredData && Object.keys(page.metadata.structuredData).length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-4">
                            <h5 className="font-medium text-slate-900 mb-3">Extracted Data</h5>
                            <div className="grid md:grid-cols-2 gap-2 text-sm">
                              {Object.entries(page.metadata.structuredData)
                                .filter(([key, value]) => value && value !== '')
                                .map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium text-slate-700 capitalize">{key}:</span>
                                    <span className="ml-2 text-slate-600 break-words">
                                      {Array.isArray(value) ? value.join(', ') : String(value)}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h5 className="font-medium text-slate-900 mb-3">Page Metadata</h5>
                          <div className="space-y-2 text-sm">
                            <div><span className="text-slate-600">Title:</span> <span className="text-slate-900">{page.metadata.title || page.title}</span></div>
                            {page.metadata.description && (
                              <div><span className="text-slate-600">Description:</span> <span className="text-slate-900">{page.metadata.description}</span></div>
                            )}
                            <div><span className="text-slate-600">URL:</span> <span className="text-slate-900 break-all">{page.url}</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Export Button Component - Only Markdown
function ExportButton({ sessionId, format }: { sessionId: string; format: string }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportSession(sessionId, format, {
        includeStructuredData: true
      });
      
      if (response.success && response.data.downloadUrl) {
        const downloadUrl = `${API_BASE_URL}${response.data.downloadUrl}`;
        
        // Try direct download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = response.data.fileName || 'export';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(response.message || 'Export failed');
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      const statusCode = err?.status ? ` (Status: ${err.status})` : '';
      alert(`Export failed${statusCode}: ${errorMessage}\n\nPlease ensure:\n1. Backend server is running on port 5000\n2. CORS is properly configured\n3. The session exists and is completed\n4. Check browser console for more details`);
    } finally {
      setExporting(false);
    }
  };

  const getIcon = () => {
    return <FileText className="w-4 h-4" />;
  };

  const getLabel = () => {
    return 'Markdown';
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all"
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : getIcon()}
      <span className="text-sm font-medium">{exporting ? 'Exporting...' : getLabel()}</span>
    </button>
  );
} 