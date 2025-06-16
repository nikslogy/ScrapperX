'use client';

import { useState } from 'react';
import { ScrapedData, ScrapingState } from '@/types/scraper';
import { scrapeWebsite, checkRobots } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import RobotsCheck from './RobotsCheck';
import ScrapingResults from './ScrapingResults';

export default function ScrapperInterface() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ScrapingState>('idle');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [robotsData, setRobotsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (error) setError(null);
    if (robotsData) setRobotsData(null);
  };

  const handleCheckRobots = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setState('checking-robots');
    setError(null);

    try {
      const response = await checkRobots(url);
      setRobotsData(response.data);
      setState('robots-checked');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  };

  const handleScrape = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setState('scraping');
    setError(null);
    setScrapedData(null);

    try {
      const response = await scrapeWebsite(url);
      setScrapedData(response.data);
      setState('completed');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  };

  const handleReset = () => {
    setUrl('');
    setState('idle');
    setScrapedData(null);
    setRobotsData(null);
    setError(null);
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const canScrape = url && isValidUrl(url) && (!robotsData || robotsData.complianceReport.canScrape);

  return (
    <div className="max-w-4xl mx-auto">
      {/* URL Input Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                disabled={state === 'scraping' || state === 'checking-robots'}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCheckRobots}
              disabled={!url || !isValidUrl(url) || state === 'checking-robots' || state === 'scraping'}
              className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {state === 'checking-robots' ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Checking robots.txt...</span>
                </>
              ) : (
                <>
                  <span className="mr-2">🤖</span>
                  Check robots.txt
                </>
              )}
            </button>

            <button
              onClick={handleScrape}
              disabled={!canScrape || state === 'scraping' || state === 'checking-robots'}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium"
            >
              {state === 'scraping' ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Scraping...</span>
                </>
              ) : (
                <>
                  <span className="mr-2">🚀</span>
                  Scrape Website
                </>
              )}
            </button>

            {(scrapedData || error || robotsData) && (
              <button
                onClick={handleReset}
                className="flex-1 sm:flex-none px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors duration-200 flex items-center justify-center"
              >
                <span className="mr-2">🔄</span>
                Reset
              </button>
            )}
          </div>

          {/* URL Validation */}
          {url && !isValidUrl(url) && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
              <span>⚠️</span>
              <span className="text-sm">Please enter a valid URL (including http:// or https://)</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Robots Check Results */}
      {robotsData && (
        <RobotsCheck data={robotsData} />
      )}

      {/* Scraping Results */}
      {scrapedData && (
        <ScrapingResults data={scrapedData} originalUrl={url} />
      )}

      {/* Usage Instructions */}
      {state === 'idle' && !scrapedData && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-3">🎯 How to use ScrapperX</h3>
          <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
            <li>Enter the URL of the website you want to scrape</li>
            <li>Optionally check robots.txt to ensure compliance</li>
            <li>Click "Scrape Website" to extract content</li>
            <li>View results and export in your preferred format</li>
          </ol>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Disclaimer:</strong> By using this tool, you confirm that you have permission to scrape the target website and will respect their terms of service.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 