'use client';

import { useState } from 'react';
import { ScrapedData, ScrapingState, RobotsCheckData } from '@/types/scraper';
import { scrapeWebsite, checkRobots } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import RobotsCheck from './RobotsCheck';
import ScrapingResults from './ScrapingResults';
import { Settings, Play, RotateCcw } from 'lucide-react';

export default function ScrapperInterface() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ScrapingState>('idle');
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [robotsData, setRobotsData] = useState<RobotsCheckData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Main Input Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="space-y-4">
          {/* URL Input */}
          <div>
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              placeholder="Enter website URL..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all text-slate-900 placeholder-slate-400"
              disabled={state === 'scraping' || state === 'checking-robots'}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleScrape}
              disabled={!canScrape || state === 'scraping' || state === 'checking-robots'}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all flex items-center justify-center gap-2"
            >
              {state === 'scraping' ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Scraping...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Scrape</span>
                </>
              )}
            </button>

            {(scrapedData || error || robotsData) && (
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Advanced Options</span>
          </button>

          {/* Advanced Options Panel */}
          {showAdvancedOptions && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4 border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Method</label>
                  <select
                    value={advancedOptions.forceMethod}
                    onChange={(e) => handleAdvancedOptionChange('forceMethod', e.target.value)}
                    className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  >
                    <option value="">Auto-detect</option>
                    <option value="static">Static HTML</option>
                    <option value="dynamic">Dynamic</option>
                    <option value="stealth">Stealth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Stealth Level</label>
                  <select
                    value={advancedOptions.stealthLevel}
                    onChange={(e) => handleAdvancedOptionChange('stealthLevel', e.target.value)}
                    className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  >
                    <option value="basic">Basic</option>
                    <option value="advanced">Advanced</option>
                    <option value="maximum">Maximum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">CAPTCHA</label>
                  <select
                    value={advancedOptions.captchaSolver}
                    onChange={(e) => handleAdvancedOptionChange('captchaSolver', e.target.value)}
                    className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  >
                    <option value="skip">Skip</option>
                    <option value="manual">Manual</option>
                    <option value="2captcha">2captcha</option>
                    <option value="anticaptcha">AntiCaptcha</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Timeout (ms)</label>
                  <input
                    type="number"
                    value={advancedOptions.timeout}
                    onChange={(e) => handleAdvancedOptionChange('timeout', parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={advancedOptions.enableStealthScraping}
                    onChange={(e) => handleAdvancedOptionChange('enableStealthScraping', e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Stealth Mode</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={advancedOptions.enableAdaptiveScraping}
                    onChange={(e) => handleAdvancedOptionChange('enableAdaptiveScraping', e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span>Adaptive</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Robots Check Results */}
      {robotsData && <RobotsCheck data={robotsData} />}

      {/* Scraping Results */}
      {scrapedData && <ScrapingResults data={scrapedData} originalUrl={url} />}
    </div>
  );
}
