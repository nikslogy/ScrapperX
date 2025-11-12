'use client';

import { useState } from 'react';
import ScrapperInterface from '@/components/ScrapperInterface';
import DomainCrawler from '@/components/DomainCrawler';
import { Globe, Zap } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState('scrapper');

  const tabs = [
    {
      id: 'scrapper',
      name: 'Quick Scraper',
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: 'crawler',
      name: 'Domain Crawler',
      icon: <Globe className="w-4 h-4" />
    }
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'scrapper':
        return <ScrapperInterface />;
      case 'crawler':
        return <DomainCrawler />;
      default:
        return <ScrapperInterface />;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Minimal Header */}
      <header className="border-b border-slate-200 bg-white/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">S</span>
              </div>
              <span className="text-lg font-semibold text-slate-900">ScrapperX</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {/* Minimal Tab Navigation */}
        <div className="mb-8">
          <div className="flex justify-center">
            <nav className="flex space-x-1 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
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

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">© 2025 ScrapperX</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
