'use client';

import { useState, useEffect } from 'react';
import { getAdaptiveStats, getSuccessRates, clearAdaptiveProfile, exportAdaptiveProfiles, importAdaptiveProfiles } from '@/lib/api';
import { WebsiteProfile, SuccessRatesSummary } from '@/types/scraper';
import LoadingSpinner from './LoadingSpinner';

interface AdaptiveAnalyticsProps {
  onClose: () => void;
}

export default function AdaptiveAnalytics({ onClose }: AdaptiveAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [successRates, setSuccessRates] = useState<SuccessRatesSummary | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [domainStats, setDomainStats] = useState<WebsiteProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const rates = await getSuccessRates();
      setSuccessRates(rates.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadDomainStats = async (domain: string) => {
    try {
      const stats = await getAdaptiveStats(domain);
      if (Array.isArray(stats.data)) {
        setDomainStats(stats.data[0] || null);
      } else {
        setDomainStats(stats.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domain stats');
    }
  };

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    loadDomainStats(domain);
  };

  const handleClearProfile = async (domain: string) => {
    if (!confirm(`Are you sure you want to clear the adaptive profile for ${domain}?`)) {
      return;
    }

    try {
      await clearAdaptiveProfile(domain);
      await loadAnalytics();
      if (selectedDomain === domain) {
        setSelectedDomain('');
        setDomainStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear profile');
    }
  };

  const handleExportProfiles = async () => {
    try {
      const profiles = await exportAdaptiveProfiles();
      const blob = new Blob([profiles], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adaptive-profiles-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export profiles');
    }
  };

  const handleImportProfiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importAdaptiveProfiles(text);
      await loadAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import profiles');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-orange-600 bg-orange-100';
      case 'extreme': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-yellow-600';
    if (rate >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-center">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">🧠 Adaptive Scraping Analytics</h2>
            <p className="text-gray-600">Monitor and manage intelligent scraping performance</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="p-6">
          {/* Summary Stats */}
          {successRates && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{successRates.totalDomains}</div>
                <div className="text-sm text-blue-800">Domains Learned</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round(successRates.summary.averageStaticSuccess * 100)}%
                </div>
                <div className="text-sm text-green-800">Avg Static Success</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(successRates.summary.averageDynamicSuccess * 100)}%
                </div>
                <div className="text-sm text-purple-800">Avg Dynamic Success</div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-indigo-600">
                  {Math.round(successRates.summary.averageStealthSuccess * 100)}%
                </div>
                <div className="text-sm text-indigo-800">Avg Stealth Success</div>
              </div>
            </div>
          )}

          {/* Difficulty Distribution */}
          {successRates?.summary?.difficultyDistribution && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-4">Website Difficulty Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(successRates.summary.difficultyDistribution).map(([difficulty, count]) => (
                  <div key={difficulty} className="text-center">
                    <div className={`text-lg font-bold ${getDifficultyColor(difficulty).split(' ')[0]}`}>
                      {count as number}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(difficulty)}`}>
                      {difficulty.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Management Actions */}
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-4">Profile Management</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportProfiles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📤 Export Profiles
              </button>
              <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                📥 Import Profiles
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportProfiles}
                  className="hidden"
                />
              </label>
              <button
                onClick={loadAnalytics}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>

          {/* Domain List */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Website Profiles</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {successRates?.successRates && successRates.successRates.length > 0 ? (
                  successRates.successRates.map((site, index: number) => (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDomain === site.domain
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDomainSelect(site.domain)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{site.domain}</div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block ${getDifficultyColor(site.difficulty)}`}>
                            {site.difficulty}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm space-x-2">
                            <span className={`font-medium ${getSuccessRateColor(site.rates.static)}`}>
                              S: {Math.round(site.rates.static * 100)}%
                            </span>
                            <span className={`font-medium ${getSuccessRateColor(site.rates.dynamic)}`}>
                              D: {Math.round(site.rates.dynamic * 100)}%
                            </span>
                            <span className={`font-medium ${getSuccessRateColor(site.rates.stealth)}`}>
                              St: {Math.round(site.rates.stealth * 100)}%
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearProfile(site.domain);
                            }}
                            className="text-xs text-red-600 hover:text-red-800 mt-1"
                          >
                            Clear Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <p>No website profiles yet</p>
                    <p className="text-sm">Start scraping websites to see analytics here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Domain Details */}
            <div>
              {selectedDomain ? (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Profile Details: {selectedDomain}
                  </h3>
                  {domainStats ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Characteristics</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span>Anti-Bot:</span>
                            <span className={domainStats.characteristics?.hasAntiBot ? 'text-red-600' : 'text-green-600'}>
                              {domainStats.characteristics?.hasAntiBot ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Requires JS:</span>
                            <span className={domainStats.characteristics?.requiresJS ? 'text-orange-600' : 'text-green-600'}>
                              {domainStats.characteristics?.requiresJS ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rate Limited:</span>
                            <span className={domainStats.characteristics?.hasRateLimit ? 'text-red-600' : 'text-green-600'}>
                              {domainStats.characteristics?.hasRateLimit ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Has CAPTCHA:</span>
                            <span className={domainStats.characteristics?.hasCaptcha ? 'text-red-600' : 'text-green-600'}>
                              {domainStats.characteristics?.hasCaptcha ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Success Rates</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Static:</span>
                            <span className={`font-medium ${getSuccessRateColor(domainStats.successRates?.static || 0)}`}>
                              {Math.round((domainStats.successRates?.static || 0) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Dynamic:</span>
                            <span className={`font-medium ${getSuccessRateColor(domainStats.successRates?.dynamic || 0)}`}>
                              {Math.round((domainStats.successRates?.dynamic || 0) * 100)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stealth:</span>
                            <span className={`font-medium ${getSuccessRateColor(domainStats.successRates?.stealth || 0)}`}>
                              {Math.round((domainStats.successRates?.stealth || 0) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Statistics</h4>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Total Attempts:</span>
                            <span>{domainStats.totalAttempts || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Optimal Strategy:</span>
                            <span className="font-medium">{domainStats.optimalStrategy?.type?.toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Updated:</span>
                            <span>{domainStats.lastUpdated ? new Date(domainStats.lastUpdated).toLocaleDateString() : 'Never'}</span>
                          </div>
                        </div>
                      </div>

                      {domainStats.recentFailures && domainStats.recentFailures.length > 0 && (
                        <div className="p-4 bg-red-50 rounded-lg">
                          <h4 className="font-medium text-red-900 mb-2">Recent Failures</h4>
                          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                            {domainStats.recentFailures.map((failure: string, index: number) => (
                              <div key={index} className="text-red-800">• {failure}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Loading domain details...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Select a domain to view detailed analytics
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 