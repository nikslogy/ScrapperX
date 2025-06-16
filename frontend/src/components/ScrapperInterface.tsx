'use client';

import { useState } from 'react';
import { ScrapedData, ScrapingState, RobotsCheckData } from '@/types/scraper';
import { scrapeWebsite, checkRobots } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import RobotsCheck from './RobotsCheck';
import ScrapingResults from './ScrapingResults';
import AdaptiveAnalytics from './AdaptiveAnalytics';

export default function ScrapperInterface() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ScrapingState>('idle');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [robotsData, setRobotsData] = useState<RobotsCheckData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    forceMethod: '',
    enableStealthScraping: true,
    enableAdaptiveScraping: true,
    captchaSolver: 'skip',
    captchaApiKey: '',
    stealthLevel: 'advanced',
    timeout: 60000,
    maxRetries: 3,
    learningMode: true
  });

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
      // Prepare options, filtering out empty values
      const options = Object.fromEntries(
        Object.entries(advancedOptions).filter(([, value]) => 
          value !== '' && value !== null && value !== undefined
        )
      );

      const response = await scrapeWebsite(url, options);
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
    setShowAdvancedOptions(false);
  };

  const handleAdvancedOptionChange = (key: string, value: unknown) => {
    setAdvancedOptions(prev => ({
      ...prev,
      [key]: value
    }));
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

            <button
              onClick={() => setShowAnalytics(true)}
              className="flex-1 sm:flex-none px-6 py-3 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 flex items-center justify-center"
            >
              <span className="mr-2">📊</span>
              Analytics
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

          {/* Advanced Options Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <span className="mr-2">{showAdvancedOptions ? '🔽' : '▶️'}</span>
              Advanced Scraping Options
            </button>
          </div>

          {/* Advanced Options Panel */}
          {showAdvancedOptions && (
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h4 className="font-medium text-gray-900 mb-4">🛠️ Advanced Configuration</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Force Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Force Scraping Method
                  </label>
                  <select
                    value={advancedOptions.forceMethod}
                    onChange={(e) => handleAdvancedOptionChange('forceMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Auto-detect (Recommended)</option>
                    <option value="static">Static HTML</option>
                    <option value="dynamic">Dynamic (JavaScript)</option>
                    <option value="stealth">Stealth Mode</option>
                    <option value="adaptive">Adaptive Learning</option>
                  </select>
                </div>

                {/* Stealth Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stealth Level
                  </label>
                  <select
                    value={advancedOptions.stealthLevel}
                    onChange={(e) => handleAdvancedOptionChange('stealthLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="maximum">Maximum</option>
                  </select>
                </div>

                {/* CAPTCHA Solver */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CAPTCHA Handling
                  </label>
                  <select
                    value={advancedOptions.captchaSolver}
                    onChange={(e) => handleAdvancedOptionChange('captchaSolver', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="skip">Skip CAPTCHAs</option>
                    <option value="manual">Manual Solving</option>
                    <option value="2captcha">2captcha Service</option>
                    <option value="anticaptcha">AntiCaptcha Service</option>
                  </select>
                </div>

                {/* Timeout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={advancedOptions.timeout}
                    onChange={(e) => handleAdvancedOptionChange('timeout', parseInt(e.target.value))}
                    min="10000"
                    max="120000"
                    step="5000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Max Retries */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    value={advancedOptions.maxRetries}
                    onChange={(e) => handleAdvancedOptionChange('maxRetries', parseInt(e.target.value))}
                    min="1"
                    max="5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* CAPTCHA API Key */}
                {(advancedOptions.captchaSolver === '2captcha' || advancedOptions.captchaSolver === 'anticaptcha') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CAPTCHA Service API Key
                    </label>
                    <input
                      type="password"
                      value={advancedOptions.captchaApiKey}
                      onChange={(e) => handleAdvancedOptionChange('captchaApiKey', e.target.value)}
                      placeholder="Enter your API key"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Feature Toggles */}
              <div className="space-y-3">
                <h5 className="font-medium text-gray-800">Feature Toggles</h5>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedOptions.enableStealthScraping}
                    onChange={(e) => handleAdvancedOptionChange('enableStealthScraping', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Stealth Scraping</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedOptions.enableAdaptiveScraping}
                    onChange={(e) => handleAdvancedOptionChange('enableAdaptiveScraping', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Adaptive Learning</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedOptions.learningMode}
                    onChange={(e) => handleAdvancedOptionChange('learningMode', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Learning Mode (Improve over time)</span>
                </label>
              </div>

              {/* Advanced Options Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h6 className="font-medium text-blue-900 mb-2">ℹ️ Advanced Features</h6>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li><strong>Stealth Mode:</strong> Bypasses anti-bot protection using browser fingerprinting</li>
                  <li><strong>Adaptive Learning:</strong> Learns optimal strategies for each website</li>
                  <li><strong>CAPTCHA Solving:</strong> Automatically handles CAPTCHA challenges</li>
                  <li><strong>Rate Limiting:</strong> Intelligent request pacing to avoid blocks</li>
                </ul>
              </div>
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

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <AdaptiveAnalytics onClose={() => setShowAnalytics(false)} />
      )}

      {/* Usage Instructions */}
      {state === 'idle' && !scrapedData && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-3">🎯 How to use ScrapperX</h3>
          <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
            <li>Enter the URL of the website you want to scrape</li>
            <li>Optionally check robots.txt to ensure compliance</li>
            <li>Configure advanced options for challenging websites</li>
            <li>Click "Scrape Website" to extract content intelligently</li>
            <li>View results and export in your preferred format</li>
            <li>Monitor performance with the Analytics dashboard</li>
          </ol>
          
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">🚀 Advanced Features</h4>
            <ul className="text-xs text-purple-800 space-y-1">
              <li><strong>🥷 Stealth Mode:</strong> Bypass anti-bot protection with advanced fingerprinting</li>
              <li><strong>🧠 Adaptive Learning:</strong> AI learns optimal strategies for each website</li>
              <li><strong>🔐 CAPTCHA Solving:</strong> Automatic CAPTCHA handling with multiple services</li>
              <li><strong>⚡ Smart Retries:</strong> Intelligent fallback strategies and rate limiting</li>
              <li><strong>📊 Analytics:</strong> Track success rates and optimize performance</li>
            </ul>
          </div>
          
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