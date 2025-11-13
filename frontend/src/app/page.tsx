'use client';

import { useState } from 'react';
import ScrapperInterface from '@/components/ScrapperInterface';
import DomainCrawler from '@/components/DomainCrawler';
import { Globe, Zap, Github, ListPlus, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState('scrapper');
  const router = useRouter();

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
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-2 select-none">
            <span className="text-2xl font-bold tracking-tight text-black">
              <span className="text-blue-600">S</span>crapper
              <span className="ml-0.5 text-fuchsia-600">X</span>
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/docs"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-black"
            >
              Docs
            </a>
            <a
              href="https://github.com/nikslogy/ScrapperX"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              GitHub
            </a>          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl lg:text-6xl">
            URL to structured data, 
            <br />
            <span className="text-gray-600 flex flex-col items-center justify-center gap-2 sm:inline sm:gap-0">
              <span className="inline-flex items-center gap-2">
                Free and Open-Source
                <a
                  href="https://github.com/nikslogy/ScrapperX"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on GitHub"
                  className="ml-2 inline-flex items-center rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors shadow-sm"
                  style={{ verticalAlign: 'middle' }}
                >
                  <Github className="w-4 h-4 mr-1" /> GitHub
                </a>
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 sm:text-lg lg:text-xl">
            Fast web scraping and domain crawling
          </p>
          {/* NEW: Batch Scrape Announcement */}
          <div className="mx-auto mt-6 max-w-2xl flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-black shadow-sm mb-2">
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-md font-semibold mr-2">NEW</span>
              <ListPlus className="w-4 h-4 text-blue-500" />
              <span>
                <strong>Batch Scrape</strong> — try the&nbsp;
                <span
                  tabIndex={0}
                  role="button"
                  onClick={() => router.push('/docs#batchscrape')}
                  className="inline-flex items-center font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900 hover:cursor-pointer transition-colors"
                  title="Go to docs"
                >
                  API: Scrape multiple URLs in one request
                  <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </span>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#workspace"
              className="inline-flex w-full items-center justify-center rounded-lg bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:w-auto sm:text-base"
            >
              Get Started
            </a>
            <a
              href="/docs"
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-black transition-colors hover:border-black hover:bg-gray-50 sm:w-auto sm:text-base"
            >
              API Docs
            </a>
          </div>
        </div>
      </section>

      {/* Workspace Section */}
      <section id="workspace" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <nav className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-colors sm:text-base ${
                  activeTab === tab.id
                    ? 'border-b-2 border-black bg-gray-50 text-black'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="min-h-[500px]">{renderActiveComponent()}</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-gray-600 sm:flex-row sm:px-6 lg:px-8">
          <span className="text-black">© {new Date().getFullYear()} ScrapperX</span>
          <div className="flex items-center gap-6">
            <a href="/docs" className="text-black transition-colors hover:text-gray-600">
              Docs
            </a>
            <a href="mailto:nikitpotdar@gmail.com" className="text-black transition-colors hover:text-gray-600">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
