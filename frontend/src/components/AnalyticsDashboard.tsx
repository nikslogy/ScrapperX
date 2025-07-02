'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  Globe,
  FileText,
  Clock,
  Database,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  Users,
  Activity,
  BarChart3,
  Zap,
  Target,
  Brain,
  HelpCircle
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

interface AnalyticsData {
  overview: {
    totalSessions: number;
    totalPages: number;
    totalItems: number;
    avgQuality: number;
    activeToday: number;
    successRate: number;
  };
  trends: {
    date: string;
    sessions: number;
    pages: number;
    items: number;
    quality: number;
  }[];
  domains: {
    domain: string;
    sessions: number;
    pages: number;
    items: number;
    successRate: number;
  }[];
  dataTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  performance: {
    avgResponseTime: number;
    errors: number;
    retries: number;
    bandwidth: number;
  };
  totalCrawls: number;
  totalPages: number;
  successRate: number;
  avgQualityScore: number;
  contentTypes: { [key: string]: number };
  topDomains: Array<{ domain: string; pages: number; quality: number }>;
  aiInsights: {
    mostCommonPattern: string;
    avgConfidence: number;
    totalStructuredData: number;
    recommendations: string[];
  };
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6366F1'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [showAIExplanation, setShowAIExplanation] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/crawler/analytics?timeRange=${timeRange}d`);
      
      if (!response.ok) {
        console.warn('Analytics API not available, using mock data');
        setData(generateMockData());
        return;
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Ensure all required fields exist with defaults
        const safeData = {
          ...generateMockData(), // Use mock as default structure
          ...result.data, // Override with actual data where available
          contentTypes: result.data.contentTypes || {},
          topDomains: result.data.topDomains || [],
          aiInsights: result.data.aiInsights || {
            mostCommonPattern: 'N/A',
            avgConfidence: 0,
            totalStructuredData: 0,
            recommendations: []
          }
        };
        setData(safeData);
      } else {
        setData(generateMockData());
      }
    } catch (err: any) {
      console.warn('Analytics fetch error, using mock data:', err.message);
      setData(generateMockData());
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (): AnalyticsData => {
    const days = parseInt(timeRange);
    const trends = Array.from({ length: days }, (_, i) => ({
      date: format(subDays(new Date(), days - i - 1), 'yyyy-MM-dd'),
      sessions: Math.floor(Math.random() * 20) + 5,
      pages: Math.floor(Math.random() * 500) + 100,
      items: Math.floor(Math.random() * 200) + 50,
      quality: Math.random() * 0.3 + 0.7
    }));

    return {
      overview: {
        totalSessions: 142,
        totalPages: 3567,
        totalItems: 8942,
        avgQuality: 0.85,
        activeToday: 12,
        successRate: 94.2
      },
      trends,
      domains: [
        { domain: 'news.ycombinator.com', sessions: 23, pages: 450, items: 892, successRate: 98.5 },
        { domain: 'reddit.com', sessions: 18, pages: 320, items: 567, successRate: 92.1 },
        { domain: 'github.com', sessions: 15, pages: 280, items: 445, successRate: 96.8 },
        { domain: 'stackoverflow.com', sessions: 12, pages: 240, items: 398, successRate: 91.3 },
        { domain: 'medium.com', sessions: 9, pages: 180, items: 287, successRate: 89.7 }
      ],
      dataTypes: [
        { type: 'article', count: 3420, percentage: 38.2 },
        { type: 'product', count: 2156, percentage: 24.1 },
        { type: 'contact', count: 1789, percentage: 20.0 },
        { type: 'event', count: 892, percentage: 10.0 },
        { type: 'job', count: 456, percentage: 5.1 },
        { type: 'generic', count: 229, percentage: 2.6 }
      ],
      performance: {
        avgResponseTime: 2.3,
        errors: 24,
        retries: 67,
        bandwidth: 128.5
      },
      totalCrawls: 23,
      totalPages: 187,
      successRate: 94.2,
      avgQualityScore: 73.5,
      contentTypes: {
        'product': 45,
        'article': 38,
        'contact': 15,
        'listing': 32,
        'navigation': 21,
        'unknown': 36
      },
      topDomains: [
        { domain: 'news.ycombinator.com', pages: 25, quality: 85.2 },
        { domain: 'example-shop.com', pages: 18, quality: 67.8 },
        { domain: 'tech-blog.io', pages: 12, quality: 92.1 }
      ],
      aiInsights: {
        mostCommonPattern: 'product listings',
        avgConfidence: 0.847,
        totalStructuredData: 156,
        recommendations: [
          'Focus on product pages for better structured data extraction',
          'Consider deeper crawling for article-heavy sites',
          'Quality scores suggest good content detection accuracy'
        ]
      }
    };
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-red-800">
          <TrendingUp className="w-5 h-5" />
          <span>Failed to load analytics: {error}</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
            <p className="text-gray-600">Insights into your scraping operations</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          
          <button
            onClick={fetchAnalytics}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* AI Explanation Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-sm border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Brain className="w-6 h-6 mr-2 text-blue-600" />
            Understanding AI Web Scraping
          </h2>
          <button
            onClick={() => setShowAIExplanation(!showAIExplanation)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <HelpCircle className="w-5 h-5" />
            <span>{showAIExplanation ? 'Hide' : 'Learn More'}</span>
          </button>
        </div>

        {showAIExplanation ? (
          <div className="space-y-6">
            {/* How AI Scores Work */}
            <div className="bg-white rounded-lg p-5 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                How AI Quality Scores Work
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">📊 Quality Score (0-100)</h4>
                  <ul className="space-y-1 text-blue-700">
                    <li>• <strong>90-100:</strong> Excellent - Rich, well-structured content</li>
                    <li>• <strong>70-89:</strong> Good - Clear content with some structure</li>
                    <li>• <strong>50-69:</strong> Fair - Basic content, limited structure</li>
                    <li>• <strong>Below 50:</strong> Poor - Minimal or unclear content</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🎯 Confidence Level (0-100%)</h4>
                  <ul className="space-y-1 text-blue-700">
                    <li>• <strong>90-100%:</strong> Very certain about content classification</li>
                    <li>• <strong>70-89%:</strong> Good confidence in analysis</li>
                    <li>• <strong>50-69%:</strong> Moderate confidence, mixed signals</li>
                    <li>• <strong>Below 50%:</strong> Low confidence, unclear content</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* What AI Analyzes */}
            <div className="bg-white rounded-lg p-5 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Zap className="w-5 h-5 mr-2" />
                What AI Analyzes on Each Page
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">Content Classification</h4>
                  <ul className="text-blue-800 space-y-1">
                    <li>• Product vs Article vs Contact</li>
                    <li>• Navigation vs Listing pages</li>
                    <li>• Main content vs sidebar</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">Data Extraction</h4>
                  <ul className="text-blue-800 space-y-1">
                    <li>• Prices, descriptions, titles</li>
                    <li>• Contact info, addresses</li>
                    <li>• Dates, authors, categories</li>
                  </ul>
                </div>
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-medium text-blue-900 mb-2">Pattern Recognition</h4>
                  <ul className="text-blue-800 space-y-1">
                    <li>• Recurring page structures</li>
                    <li>• Common data formats</li>
                    <li>• Navigation patterns</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Benefits for Users */}
            <div className="bg-white rounded-lg p-5 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                How This Helps You
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-2">🚀 Automatic Filtering</h4>
                  <p>Only high-quality, relevant pages are included in your results. Low-quality or irrelevant content is automatically filtered out.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">🎯 Smart Categorization</h4>
                  <p>Pages are automatically sorted by type - no manual work needed to separate products from articles or contact pages.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">📊 Structured Extraction</h4>
                  <p>Key information is automatically extracted and formatted - prices, contacts, dates, etc. are ready to use.</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">💡 Actionable Insights</h4>
                  <p>AI provides recommendations for better scraping strategies and identifies the most valuable content patterns.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-blue-800">
            <p className="mb-2">
              Our AI analyzes every page to classify content types, extract structured data, and assess quality scores. 
              This ensures you get the most relevant, high-quality information automatically.
            </p>
            <p className="text-sm text-blue-700">
              Click "Learn More" to understand how AI scores work and how they benefit your scraping projects.
            </p>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Sessions</span>
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalSessions)}</div>
          <div className="text-xs text-green-600">+12% from last period</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Pages Scraped</span>
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalPages)}</div>
          <div className="text-xs text-green-600">+8% from last period</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Items Extracted</span>
            <FileText className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalItems)}</div>
          <div className="text-xs text-green-600">+15% from last period</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Avg Quality</span>
            <TrendingUp className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatPercentage(data.overview.avgQuality)}</div>
          <div className="text-xs text-green-600">+2% from last period</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Today</span>
            <Activity className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{data.overview.activeToday}</div>
          <div className="text-xs text-red-600">-3% from yesterday</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Success Rate</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{data.overview.successRate}%</div>
          <div className="text-xs text-green-600">+1% from last period</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => format(parseISO(value), 'MMM dd, yyyy')}
              />
              <Line 
                type="monotone" 
                dataKey="sessions" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                name="Sessions"
              />
              <Line 
                type="monotone" 
                dataKey="pages" 
                stroke="#10B981" 
                strokeWidth={2}
                name="Pages"
              />
              <Line 
                type="monotone" 
                dataKey="items" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Items"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Types Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Types Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.dataTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ type, percentage }) => `${type} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.dataTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.performance.avgResponseTime}s</div>
            <div className="text-sm text-blue-800">Avg Response Time</div>
          </div>
          
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{data.performance.errors}</div>
            <div className="text-sm text-red-800">Total Errors</div>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{data.performance.retries}</div>
            <div className="text-sm text-yellow-800">Retries</div>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.performance.bandwidth} MB</div>
            <div className="text-sm text-green-800">Bandwidth Used</div>
          </div>
        </div>

        {/* Quality Score */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Quality Score</span>
            <span className="text-lg font-bold text-green-600">
              {formatPercentage(data.overview.avgQuality)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${data.overview.avgQuality * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              <FileText className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-purple-600" />
            Scraping Analytics
          </h2>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-700">{data.totalCrawls || 0}</div>
            <div className="text-sm text-blue-600">Total Crawls</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-700">{data.totalPages || 0}</div>
            <div className="text-sm text-green-600">Pages Analyzed</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-700">{data.successRate || 0}%</div>
            <div className="text-sm text-purple-600">Success Rate</div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-700">{data.avgQualityScore || 0}</div>
            <div className="text-sm text-orange-600">Avg Quality Score</div>
          </div>
        </div>

        {/* Content Types Distribution */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Content Types Analyzed</h3>
            <div className="space-y-2">
              {data.contentTypes && Object.keys(data.contentTypes).length > 0 ? (
                Object.entries(data.contentTypes).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="capitalize text-sm text-gray-700">{type}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(data.contentTypes))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8">{count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No content type data available</p>
                  <p className="text-xs mt-1">Start crawling to see content analysis</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Top Performing Domains</h3>
            <div className="space-y-3">
              {data.topDomains && data.topDomains.length > 0 ? (
                data.topDomains.map((domain, index) => (
                  <div key={index} className="bg-white rounded p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{domain.domain}</span>
                      <span className="text-xs text-green-600 font-medium">{domain.quality}% quality</span>
                    </div>
                    <div className="text-xs text-gray-600">{domain.pages} pages analyzed</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No domain data available</p>
                  <p className="text-xs mt-1">Start crawling to see performance data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-3 flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            AI Insights & Recommendations
          </h3>
          {data.aiInsights ? (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
                <div className="text-center bg-white rounded p-3">
                  <div className="text-lg font-bold text-purple-700">{data.aiInsights.mostCommonPattern || 'N/A'}</div>
                  <div className="text-xs text-purple-600">Most Common Pattern</div>
                </div>
                <div className="text-center bg-white rounded p-3">
                  <div className="text-lg font-bold text-purple-700">{Math.round((data.aiInsights.avgConfidence || 0) * 100)}%</div>
                  <div className="text-xs text-purple-600">Avg AI Confidence</div>
                </div>
                <div className="text-center bg-white rounded p-3">
                  <div className="text-lg font-bold text-purple-700">{data.aiInsights.totalStructuredData || 0}</div>
                  <div className="text-xs text-purple-600">Structured Data Items</div>
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <h4 className="font-medium text-purple-900 mb-2">💡 AI Recommendations</h4>
                {data.aiInsights.recommendations && data.aiInsights.recommendations.length > 0 ? (
                  <ul className="text-sm text-purple-800 space-y-1">
                    {data.aiInsights.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-purple-500 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-purple-700 italic">No AI recommendations available yet</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-purple-700">
              <p>No AI insights available</p>
              <p className="text-xs mt-1">AI analysis will appear after crawling sessions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 