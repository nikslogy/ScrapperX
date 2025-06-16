import { RobotsCheckData } from '@/types/scraper';

interface RobotsCheckProps {
  data: RobotsCheckData;
}

export default function RobotsCheck({ data }: RobotsCheckProps) {
  const { robotsInfo, complianceReport } = data;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-xl">🤖</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Robots.txt Analysis</h3>
          <p className="text-sm text-gray-600">Checking scraping permissions for this website</p>
        </div>
      </div>

      {/* Main Status */}
      <div className={`rounded-lg p-4 mb-6 ${
        complianceReport.canScrape 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">
            {complianceReport.canScrape ? '✅' : '🚫'}
          </span>
          <div>
            <h4 className={`font-medium ${
              complianceReport.canScrape ? 'text-green-800' : 'text-red-800'
            }`}>
              {complianceReport.canScrape ? 'Scraping Allowed' : 'Scraping Restricted'}
            </h4>
            <p className={`text-sm ${
              complianceReport.canScrape ? 'text-green-700' : 'text-red-700'
            }`}>
              {robotsInfo.error || (complianceReport.canScrape 
                ? 'This website allows scraping based on robots.txt analysis'
                : 'This website restricts scraping according to robots.txt'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Basic Information</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Robots URL:</span>
              <a 
                href={robotsInfo.robotsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 truncate max-w-48"
              >
                {robotsInfo.robotsUrl}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">User Agent:</span>
              <span className="text-gray-900 font-mono text-xs">{robotsInfo.userAgent}</span>
            </div>
            {robotsInfo.crawlDelay && (
              <div className="flex justify-between">
                <span className="text-gray-600">Crawl Delay:</span>
                <span className="text-gray-900">{robotsInfo.crawlDelay}s</span>
              </div>
            )}
            {robotsInfo.sitemaps.length > 0 && (
              <div>
                <span className="text-gray-600">Sitemaps Found:</span>
                <div className="mt-1 space-y-1">
                  {robotsInfo.sitemaps.slice(0, 3).map((sitemap, index) => (
                    <a 
                      key={index}
                      href={sitemap} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-blue-600 hover:text-blue-800 text-xs truncate"
                    >
                      {sitemap}
                    </a>
                  ))}
                  {robotsInfo.sitemaps.length > 3 && (
                    <span className="text-gray-500 text-xs">
                      +{robotsInfo.sitemaps.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations & Warnings */}
        <div className="space-y-4">
          <h5 className="font-medium text-gray-900">Recommendations</h5>
          <div className="space-y-3">
            {complianceReport.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-blue-500 mt-0.5">ℹ️</span>
                <span className="text-sm text-gray-700">{rec}</span>
              </div>
            ))}
            {complianceReport.warnings.map((warning, index) => (
              <div key={index} className="flex items-start space-x-2">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <span className="text-sm text-gray-700">{warning}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Preview */}
      {robotsInfo.rules.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h5 className="font-medium text-gray-900 mb-3">Robots.txt Rules</h5>
          <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
            <div className="space-y-3">
              {robotsInfo.rules.slice(0, 3).map((rule, index) => (
                <div key={index} className="text-sm">
                  <div className="font-medium text-gray-900">User-agent: {rule.userAgent}</div>
                  {rule.allow.length > 0 && (
                    <div className="text-green-700">
                      Allow: {rule.allow.join(', ')}
                    </div>
                  )}
                  {rule.disallow.length > 0 && (
                    <div className="text-red-700">
                      Disallow: {rule.disallow.join(', ')}
                    </div>
                  )}
                </div>
              ))}
              {robotsInfo.rules.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{robotsInfo.rules.length - 3} more rules...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 