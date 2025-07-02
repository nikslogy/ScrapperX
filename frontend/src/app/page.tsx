'use client';

import { useState } from 'react';
import ScrapperInterface from '@/components/ScrapperInterface';
import DomainCrawler from '@/components/DomainCrawler';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { Globe, TrendingUp, Zap, Shield } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('scrapper');

  const tabs = [
    {
      id: 'scrapper',
      name: 'Quick Scraper',
      icon: <Zap className="w-5 h-5" />,
      description: 'Single page scraping'
    },
    {
      id: 'crawler',
      name: 'Domain Crawler',
      icon: <Globe className="w-5 h-5" />,
      description: 'Full website crawling'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: <TrendingUp className="w-5 h-5" />,
      description: 'Performance insights'
    }
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'scrapper':
        return <ScrapperInterface />;
      case 'crawler':
        return <DomainCrawler />;
      case 'analytics':
        return <AnalyticsDashboard />;
      default:
        return <ScrapperInterface />;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ScrapperX
                </h1>
                <p className="text-sm text-gray-600">Enterprise AI-Powered Web Scraper</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✨ Phase 4 Complete
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                🔒 Enterprise Ready
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Extract Website Content with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Enterprise Precision
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            From single pages to entire domains - ScrapperX delivers structured, AI-analyzed content with authentication support and enterprise-grade export capabilities.
          </p>
          
          {/* Enhanced Feature highlights */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              🤖 AI-Powered Analysis
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
              🏢 Domain Crawling
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              🔐 Authentication Support
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
              📊 Multi-Format Export
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-pink-100 text-pink-800">
              📈 Real-time Analytics
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
              🛡️ Ethical Scraping
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex justify-center">
            <nav className="flex space-x-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon}
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs opacity-75">{tab.description}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Active Component */}
        <div className="min-h-[600px]">
          {renderActiveComponent()}
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Enterprise-Grade Features</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Built for scale, security, and precision. ScrapperX delivers professional-grade web scraping capabilities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Smart Content Extraction</h4>
            <p className="text-gray-600 text-sm">
              AI-powered content identification with structured data extraction and quality scoring.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Full Domain Crawling</h4>
            <p className="text-gray-600 text-sm">
              Crawl entire websites with configurable depth, authentication, and real-time progress tracking.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Authentication Support</h4>
            <p className="text-gray-600 text-sm">
              Handle login forms, basic auth, bearer tokens, and session management automatically.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Enterprise Export</h4>
            <p className="text-gray-600 text-sm">
              Export to JSON, CSV, Excel, or multi-format archives with AI analysis included.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-200">Pages Processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-blue-200">Success Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-200">Data Types</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-200">Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="text-gray-900 font-semibold">ScrapperX</span>
            </div>
            <p className="text-sm text-gray-600">
              © 2025 ScrapperX. Built with Next.js, Express.js, MongoDB, and DeepSeek AI.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
