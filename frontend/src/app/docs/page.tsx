"use client"

import { useState, useEffect, useRef } from "react"
import { Code, Zap, Globe, Github, Copy, Check, AlertCircle } from "lucide-react"

// Slugs for each endpoint, mapping to their anchor/hash and display name
const ENDPOINTS = [
  { id: "quick-scrape", hash: "quickscrape", title: "Quick Scrape" },
  { id: "batch-scrape", hash: "batchscrape", title: "Batch Scrape" },
  { id: "domain-crawler", hash: "domaincrawler", title: "Domain Crawler" },
  { id: "crawler-status", hash: "crawlerstatus", title: "Check Crawler Status" },
  { id: "export-crawler", hash: "exportcrawler", title: "Export Crawler Data" },
  { id: "download-export", hash: "downloadexport", title: "Download Export" },
]

export default function APIDocumentation() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null)
  const [activeLanguage, setActiveLanguage] = useState<string>("python")
  const [activeCodeLanguage, setActiveCodeLanguage] = useState<Record<string, string>>({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sectionsRefs = useRef<Record<string, HTMLElement | null>>({})

  // Handles auto-scrolling to section on hash change
  useEffect(() => {
    const scrollToHash = (init = false) => {
      // If initial or hash update, try to scroll to the anchor
      const hash = window.location.hash.replace("#", "")
      if (hash) {
        const el = document.getElementById(hash)
        if (el) {
          // Scroll with slight offset for sticky header
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - 80,
            behavior: init ? "auto" : "smooth",
          })
        }
      }
    }
    scrollToHash(true)
    window.addEventListener("hashchange", () => scrollToHash(false))
    return () => {
      window.removeEventListener("hashchange", () => scrollToHash(false))
    }
  }, [])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedEndpoint(id)
    setTimeout(() => setCopiedEndpoint(null), 2000)
  }

  const setCodeLanguage = (endpointId: string, lang: string) => {
    setActiveCodeLanguage((prev) => ({ ...prev, [endpointId]: lang }))
  }

  const getCodeLanguage = (endpointId: string) => {
    return activeCodeLanguage[endpointId] || "python"
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <a href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <span className="text-base sm:text-lg font-semibold text-black">ScrapperX</span>
              </a>
              <span className="text-gray-300 hidden sm:block">/</span>
              <span className="text-gray-600 text-sm hidden sm:block">API Docs</span>
            </div>
            <a
              href="https://github.com/nikslogy/ScrapperX"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Navigation (Jump To) */}
        <nav className="mb-10">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="font-medium text-gray-700 text-xs mb-3">Jump to:</div>
            <div className="flex flex-wrap gap-2">
              {ENDPOINTS.map((ep) => (
                <a
                  key={ep.hash}
                  href={`#${ep.hash}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:border-black hover:text-black transition-colors whitespace-nowrap"
                >
                  {ep.title}
                </a>
              ))}
            </div>
          </div>
        </nav>
        {/* ---- */}
<br />
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-black px-3 py-1.5 rounded-full text-xs font-medium mb-4 sm:mb-6">
            <Github className="w-3 h-3" />
            <span>Open Source • MIT Licensed</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-black mb-3 sm:mb-4 tracking-tight">
            ScrapperX API
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
            Free web scraping API with intelligent extraction and markdown output.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 lg:mb-16">
          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 hover:border-black hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="font-semibold text-black text-base sm:text-lg">Quick Scrape</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              Single URL scraping with intelligent content extraction
            </p>
            <div className="text-xs font-medium text-black bg-gray-50 px-2 py-1 rounded inline-block">
              20 requests/min
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 hover:border-black hover:shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                <Code className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="font-semibold text-black text-base sm:text-lg">Batch Scrape</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">Scrape up to 10 URLs in one request</p>
            <div className="text-xs font-medium text-black bg-gray-50 px-2 py-1 rounded inline-block">
              5 requests/5min
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 hover:border-black hover:shadow-sm transition-all sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="font-semibold text-black text-base sm:text-lg">Site Crawler</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">Crawl entire domains with up to 200 pages</p>
            <div className="text-xs font-medium text-black bg-gray-50 px-2 py-1 rounded inline-block">
              3 requests/5min
            </div>
          </div>
        </div>

        {/* Rate Limiting Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 mb-8 sm:mb-12 lg:mb-16">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-black mb-2 text-sm sm:text-base">Hosted Service vs Self-Hosted</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Use our <span className="font-medium text-black">free hosted API</span> with rate limits shown above, or{" "}
                <span className="font-medium text-black">deploy your own instance</span> for unlimited requests. No
                authentication required - just start making requests!
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-black mb-4 sm:mb-6">Quick Start</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {[
                { id: "python", label: "Python" },
                { id: "javascript", label: "JavaScript" },
                { id: "curl", label: "cURL" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setActiveLanguage(lang.id)}
                  className={`px-4 sm:px-6 py-3 text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeLanguage === lang.id
                      ? "bg-black text-white"
                      : "text-gray-600 hover:text-black hover:bg-gray-50"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <div className="p-4 sm:p-6 relative">
              {activeLanguage === "python" && (
                <div className="relative">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `import requests

response = requests.post(
    '${apiBaseUrl}/api/scraper/scrape',
    json={
        'url': 'https://example.com',
        'options': {
            'stealthLevel': 'advanced'
        }
    }
)

data = response.json()
print(data['data']['markdownContent'])`,
                        "python-code",
                      )
                    }
                    className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors font-medium"
                    title="Copy code"
                  >
                    {copiedEndpoint === "python-code" ? "Copied!" : "Copy"}
                  </button>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm overflow-x-auto">
                    <code className="text-black">{`import requests

response = requests.post(
    '${apiBaseUrl}/api/scraper/scrape',
    json={
        'url': 'https://example.com',
        'options': {
            'stealthLevel': 'advanced'
        }
    }
)

data = response.json()
print(data['data']['markdownContent'])`}</code>
                  </pre>
                </div>
              )}
              {activeLanguage === "javascript" && (
                <div className="relative">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `const response = await fetch('${apiBaseUrl}/api/scraper/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: {
      stealthLevel: 'advanced'
    }
  })
});

const data = await response.json();
console.log(data.data.markdownContent);`,
                        "javascript-code",
                      )
                    }
                    className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors font-medium"
                    title="Copy code"
                  >
                    {copiedEndpoint === "javascript-code" ? "Copied!" : "Copy"}
                  </button>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm overflow-x-auto">
                    <code className="text-black">{`const response = await fetch('${apiBaseUrl}/api/scraper/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: {
      stealthLevel: 'advanced'
    }
  })
});

const data = await response.json();
console.log(data.data.markdownContent);`}</code>
                  </pre>
                </div>
              )}
              {activeLanguage === "curl" && (
                <div className="relative">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `curl -X POST ${apiBaseUrl}/api/scraper/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "options": {
      "stealthLevel": "advanced"
    }
  }'`,
                        "curl-code",
                      )
                    }
                    className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors font-medium"
                    title="Copy code"
                  >
                    {copiedEndpoint === "curl-code" ? "Copied!" : "Copy"}
                  </button>
                  <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm overflow-x-auto">
                    <code className="text-black">{`curl -X POST ${apiBaseUrl}/api/scraper/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "options": {
      "stealthLevel": "advanced"
    }
  }'`}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Options Reference */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-8 sm:mb-12 lg:mb-16">
          <h3 className="text-lg sm:text-xl font-semibold text-black mb-4">Common Options Reference</h3>
          <div className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">stealthLevel</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(string)</span> - Level of stealth: <code className="text-xs bg-gray-50 px-1 rounded">'basic'</code>, <code className="text-xs bg-gray-50 px-1 rounded">'advanced'</code>, <code className="text-xs bg-gray-50 px-1 rounded">'maximum'</code>. Default: <code className="text-xs bg-gray-50 px-1 rounded">'advanced'</code>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">forceMethod</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(string)</span> - Force scraping method: <code className="text-xs bg-gray-50 px-1 rounded">'static'</code>, <code className="text-xs bg-gray-50 px-1 rounded">'dynamic'</code>, <code className="text-xs bg-gray-50 px-1 rounded">'stealth'</code>, <code className="text-xs bg-gray-50 px-1 rounded">'adaptive'</code>, <code className="text-xs bg-gray-50 px-1 rounded">'api'</code>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">qualityThreshold</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(number)</span> - Minimum content quality score (0-100). Default: <code className="text-xs bg-gray-50 px-1 rounded">70</code>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">maxRetries</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(number)</span> - Max retry attempts (1-5). Default: <code className="text-xs bg-gray-50 px-1 rounded">3</code>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">timeout</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(number)</span> - Request timeout in milliseconds (1000-120000)
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">outputFormat</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(string)</span> - <span className="font-semibold text-black">Batch scrape only:</span> <code className="text-xs bg-gray-50 px-1 rounded">'markdown'</code> or <code className="text-xs bg-gray-50 px-1 rounded">'json'</code>. Default: <code className="text-xs bg-gray-50 px-1 rounded">'markdown'</code>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">respectRobots</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(boolean)</span> - Respect robots.txt rules. Default: <code className="text-xs bg-gray-50 px-1 rounded">false</code>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-start gap-2">
              <code className="text-xs bg-gray-50 px-2 py-1 rounded font-mono text-black whitespace-nowrap">learningMode</code>
              <span className="text-gray-600">
                <span className="font-medium text-black">(boolean)</span> - Enable adaptive learning from successful scrapes. Default: <code className="text-xs bg-gray-50 px-1 rounded">true</code>
              </span>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-6 mb-8 sm:mb-12 lg:mb-16">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-black mb-3 text-sm sm:text-base">Important Notes</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-black font-bold mt-0.5">•</span>
                  <span><span className="font-medium text-black">Quick Scrape</span> always returns markdown content in the response - no <code className="text-xs bg-gray-100 px-1 rounded">outputFormat</code> option needed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black font-bold mt-0.5">•</span>
                  <span><span className="font-medium text-black">Batch Scrape</span> with markdown format creates a downloadable file, JSON returns inline data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black font-bold mt-0.5">•</span>
                  <span><span className="font-medium text-black">Domain Crawler</span> returns immediately with a session ID - use the status endpoint to track progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-black font-bold mt-0.5">•</span>
                  <span>All responses include a <code className="text-xs bg-gray-100 px-1 rounded">success</code> boolean field for easy error checking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="space-y-6 sm:space-y-8 mb-12 sm:mb-16 lg:mb-20" id="api-section">
          <h2 className="text-2xl sm:text-3xl font-bold text-black mb-8">API Endpoints</h2>

          {/* Quick Scrape */}
          <SectionAnchor slug="quickscrape" title="Quick Scrape">
            <EndpointCard
              endpointId="quick-scrape"
              title="Quick Scrape"
              method="POST"
              endpoint="/api/scraper/scrape"
              description="Scrape a single URL with intelligent content extraction. Returns markdown content automatically."
              copiedEndpoint={copiedEndpoint}
              onCopy={copyToClipboard}
              apiBaseUrl={apiBaseUrl}
              activeCodeLanguage={getCodeLanguage("quick-scrape")}
              setCodeLanguage={(lang) => setCodeLanguage("quick-scrape", lang)}
              request={{
                url: "https://example.com",
                options: {
                  forceMethod: "adaptive",
                  enableStealthScraping: true,
                  stealthLevel: "advanced",
                  enableAdaptiveScraping: true,
                  qualityThreshold: 70,
                  maxRetries: 3,
                },
              }}
              response={{
                success: true,
                data: {
                  url: "https://example.com",
                  title: "Example Domain",
                  markdownContent: "# Example Domain\\n\\nThis domain is for...",
                  content: "Example Domain This domain is for...",
                  method: "static",
                  qualityScore: 95,
                  wordCount: 150,
                  scrapeTime: 1234,
                },
              }}
            />
          </SectionAnchor>

          {/* Batch Scrape */}
          <SectionAnchor slug="batchscrape" title="Batch Scrape">
            <EndpointCard
              endpointId="batch-scrape"
              title="Batch Scrape"
              method="POST"
              endpoint="/api/scraper/batch-scrape"
              description="Scrape multiple URLs (max 10) in one request. Markdown format creates a downloadable file, JSON returns inline data."
              copiedEndpoint={copiedEndpoint}
              onCopy={copyToClipboard}
              apiBaseUrl={apiBaseUrl}
              activeCodeLanguage={getCodeLanguage("batch-scrape")}
              setCodeLanguage={(lang) => setCodeLanguage("batch-scrape", lang)}
              badge="Popular"
              request={{
                urls: ["https://example.com", "https://example.org"],
                options: {
                  outputFormat: "markdown",
                  stealthLevel: "advanced",
                  enableAdaptiveScraping: true,
                },
              }}
              response={{
                success: true,
                message: "Batch scraping completed",
                data: {
                  totalUrls: 2,
                  successful: 2,
                  failed: 0,
                  outputFormat: "markdown",
                  downloadUrl: "/api/downloads/batch-scrape-1234567890.md",
                  fileName: "batch-scrape-1234567890.md",
                  results: [
                    { url: "https://example.com", title: "Example Domain", qualityScore: 95, wordCount: 150 },
                    { url: "https://example.org", title: "Example", qualityScore: 92, wordCount: 140 }
                  ],
                  errors: []
                },
              }}
            />
          </SectionAnchor>

          {/* Domain Crawler */}
          <SectionAnchor slug="domaincrawler" title="Domain Crawler">
            <EndpointCard
              endpointId="domain-crawler"
              title="Domain Crawler"
              method="POST"
              endpoint="/api/crawler/start-domain-crawl"
              description="Crawl an entire domain up to 200 pages (production limit). Returns immediately with a session ID to track progress."
              copiedEndpoint={copiedEndpoint}
              onCopy={copyToClipboard}
              apiBaseUrl={apiBaseUrl}
              activeCodeLanguage={getCodeLanguage("domain-crawler")}
              setCodeLanguage={(lang) => setCodeLanguage("domain-crawler", lang)}
              request={{
                url: "https://example.com",
                config: {
                  maxPages: 200,
                  maxDepth: 3,
                  delay: 1000,
                  concurrent: 3,
                  respectRobots: true,
                  stealthLevel: "advanced",
                  enableAdaptiveScraping: true,
                },
              }}
              response={{
                success: true,
                message: "Domain crawl started successfully",
                data: {
                  sessionId: "abc123-def456-ghi789",
                  status: "pending",
                  startUrl: "https://example.com",
                  config: {
                    maxPages: 200,
                    maxDepth: 3,
                    delay: 1000,
                    concurrent: 3
                  }
                },
              }}
            />
          </SectionAnchor>

          {/* Check Crawler Status */}
          <SectionAnchor slug="crawlerstatus" title="Check Crawler Status">
            <EndpointCard
              endpointId="crawler-status"
              title="Check Crawler Status"
              method="GET"
              endpoint="/api/crawler/session/:sessionId/status"
              description="Check the progress and status of a crawler session"
              copiedEndpoint={copiedEndpoint}
              onCopy={copyToClipboard}
              apiBaseUrl={apiBaseUrl}
              activeCodeLanguage={getCodeLanguage("crawler-status")}
              setCodeLanguage={(lang) => setCodeLanguage("crawler-status", lang)}
              response={{
                success: true,
                data: {
                  session: {
                    sessionId: "abc123-def456-ghi789",
                    status: "completed",
                    domain: "example.com",
                    startUrl: "https://example.com"
                  },
                  progress: {
                    status: "completed",
                    totalUrls: 48,
                    processedUrls: 5,
                    failedUrls: 0,
                    extractedItems: 42
                  }
                },
              }}
            />
          </SectionAnchor>

          {/* Export Crawler Data */}
          <SectionAnchor slug="exportcrawler" title="Export Crawler Data">
            <EndpointCard
              endpointId="export-crawler"
              title="Export Crawler Data"
              method="GET"
              endpoint="/api/crawler/session/:sessionId/export"
              description="Export crawled data as markdown or JSON. Use 'format' query param to specify output format."
              copiedEndpoint={copiedEndpoint}
              onCopy={copyToClipboard}
              apiBaseUrl={apiBaseUrl}
              activeCodeLanguage={getCodeLanguage("export-crawler")}
              setCodeLanguage={(lang) => setCodeLanguage("export-crawler", lang)}
              queryParams={{
                format: "markdown",
                includeStructuredData: "true",
              }}
              response={{
                success: true,
                message: "Export completed successfully",
                data: {
                  fileName: "example_com_abc123_2025-11-13.md",
                  size: 19483,
                  mimeType: "text/markdown",
                  downloadUrl: "/api/downloads/example_com_abc123_2025-11-13.md",
                  format: "markdown"
                },
              }}
            />
          </SectionAnchor>

          {/* Download File */}
          <SectionAnchor slug="downloadexport" title="Download Export">
            <EndpointCard
              endpointId="download-export"
              title="Download Export"
              method="GET"
              endpoint="/api/downloads/:fileName"
              description="Download exported markdown or JSON files from batch scrape or crawler exports"
              copiedEndpoint={copiedEndpoint}
              onCopy={copyToClipboard}
              apiBaseUrl={apiBaseUrl}
              activeCodeLanguage={getCodeLanguage("download-export")}
              setCodeLanguage={(lang) => setCodeLanguage("download-export", lang)}
              response="Binary file download (markdown or JSON)"
            />
          </SectionAnchor>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div>
                <div className="font-semibold text-black text-sm">ScrapperX</div>
                <div className="text-xs text-gray-500">v1.0.0 • MIT License</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <a href="/#workspace" className="text-sm text-gray-600 hover:text-black transition-colors">
                Try API
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-black transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

// Utility Section Anchor component with id and optional heading
function SectionAnchor({
  slug,
  title,
  children,
}: {
  slug: string
  title?: string
  children: React.ReactNode
}) {
  // Place anchor a little above to provide room for sticky header
  return (
    <section id={slug} style={{ scrollMarginTop: 100 }}>
      {children}
    </section>
  )
}

interface EndpointCardProps {
  endpointId: string
  title: string
  method: string
  endpoint: string
  description: string
  copiedEndpoint: string | null
  onCopy: (text: string, id: string) => void
  apiBaseUrl: string
  activeCodeLanguage: string
  setCodeLanguage: (lang: string) => void
  request?: any
  response?: any
  queryParams?: Record<string, string>
  badge?: string
}

function EndpointCard({
  endpointId,
  title,
  method,
  endpoint,
  description,
  copiedEndpoint,
  onCopy,
  apiBaseUrl,
  activeCodeLanguage,
  setCodeLanguage,
  request,
  response,
  queryParams,
  badge,
}: EndpointCardProps) {
  const methodColors: Record<string, string> = {
    GET: "bg-gray-100 text-black border-gray-300",
    POST: "bg-black text-white border-black",
    PUT: "bg-gray-100 text-black border-gray-300",
    DELETE: "bg-gray-100 text-black border-gray-300",
  }

  const fullEndpoint = queryParams ? `${endpoint}?${new URLSearchParams(queryParams).toString()}` : endpoint

  const getCodeExamples = () => {
    const codeId = `${endpointId}-code`

    if (endpointId === "quick-scrape") {
      const pythonCode = `import requests

response = requests.post(
    '${apiBaseUrl}/api/scraper/scrape',
    json={
        'url': 'https://example.com',
        'options': {
            'stealthLevel': 'advanced',
            'enableStealthScraping': True
        }
    }
)

data = response.json()
print(data['data']['markdownContent'])`

      const jsCode = `const response = await fetch('${apiBaseUrl}/api/scraper/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: {
      stealthLevel: 'advanced',
      enableStealthScraping: true
    }
  })
});

const data = await response.json();
console.log(data.data.markdownContent);`

      const curlCode = `curl -X POST ${apiBaseUrl}/api/scraper/scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "options": {
      "stealthLevel": "advanced",
      "enableStealthScraping": true
    }
  }'`

      return { pythonCode, jsCode, curlCode, codeId }
    }

    if (endpointId === "batch-scrape") {
      const pythonCode = `import requests

response = requests.post(
    '${apiBaseUrl}/api/scraper/batch-scrape',
    json={
        'urls': [
            'https://example.com',
            'https://example.org'
        ],
        'options': {
            'outputFormat': 'markdown'
        }
    }
)

data = response.json()
print(data['data']['downloadUrl'])`

      const jsCode = `const response = await fetch('${apiBaseUrl}/api/scraper/batch-scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    urls: [
      'https://example.com',
      'https://example.org'
    ],
    options: {
      outputFormat: 'markdown'
    }
  })
});

const data = await response.json();
console.log(data.data.downloadUrl);`

      const curlCode = `curl -X POST ${apiBaseUrl}/api/scraper/batch-scrape \\
  -H "Content-Type: application/json" \\
  -d '{
    "urls": ["https://example.com", "https://example.org"],
    "options": {
      "outputFormat": "markdown"
    }
  }'`

      return { pythonCode, jsCode, curlCode, codeId }
    }

    if (endpointId === "domain-crawler") {
      const pythonCode = `import requests

response = requests.post(
    '${apiBaseUrl}/api/crawler/start-domain-crawl',
    json={
        'url': 'https://example.com',
        'config': {
            'maxPages': 200,
            'maxDepth': 3,
            'delay': 1000,
            'concurrent': 3
        }
    }
)

data = response.json()
print(f"Session ID: {data['data']['sessionId']}")`

      const jsCode = `const response = await fetch('${apiBaseUrl}/api/crawler/start-domain-crawl', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://example.com',
    config: {
      maxPages: 200,
      maxDepth: 3,
      delay: 1000,
      concurrent: 3
    }
  })
});

const data = await response.json();
console.log('Session ID:', data.data.sessionId);`

      const curlCode = `curl -X POST ${apiBaseUrl}/api/crawler/start-domain-crawl \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "config": {
      "maxPages": 200,
      "maxDepth": 3,
      "delay": 1000,
      "concurrent": 3
    }
  }'`

      return { pythonCode, jsCode, curlCode, codeId }
    }

    if (endpointId === "crawler-status") {
      const sessionId = "abc123"
      const pythonCode = `import requests

response = requests.get(
    '${apiBaseUrl}/api/crawler/session/${sessionId}/status'
)

data = response.json()
print(f"Status: {data['data']['progress']['status']}")
print(f"Processed: {data['data']['progress']['processedUrls']}/{data['data']['progress']['totalUrls']}")`

      const jsCode = `const sessionId = 'abc123';
const response = await fetch(
  \`${apiBaseUrl}/api/crawler/session/\${sessionId}/status\`,
  { method: 'GET' }
);

const data = await response.json();
console.log('Status:', data.data.progress.status);
console.log(\`Processed: \${data.data.progress.processedUrls}/\${data.data.progress.totalUrls}\`);`

      const curlCode = `curl -X GET "${apiBaseUrl}/api/crawler/session/abc123/status"`

      return { pythonCode, jsCode, curlCode, codeId }
    }

    if (endpointId === "export-crawler") {
      const sessionId = "abc123"
      const pythonCode = `import requests

response = requests.get(
    '${apiBaseUrl}/api/crawler/session/${sessionId}/export',
    params={
        'format': 'markdown',
        'includeStructuredData': 'true'
    }
)

data = response.json()
print(data['data']['downloadUrl'])`

      const jsCode = `const sessionId = 'abc123';
const response = await fetch(
  \`${apiBaseUrl}/api/crawler/session/\${sessionId}/export?format=markdown&includeStructuredData=true\`,
  { method: 'GET' }
);

const data = await response.json();
console.log(data.data.downloadUrl);`

      const curlCode = `curl -X GET "${apiBaseUrl}/api/crawler/session/abc123/export?format=markdown&includeStructuredData=true"`

      return { pythonCode, jsCode, curlCode, codeId }
    }

    if (endpointId === "download-export") {
      const fileName = "batch-scrape-1234567890.md"
      const pythonCode = `import requests

response = requests.get('${apiBaseUrl}/api/downloads/${fileName}')

with open('${fileName}', 'wb') as f:
    f.write(response.content)
print('File downloaded')`

      const jsCode = `const fileName = 'batch-scrape-1234567890.md';
const response = await fetch(\`${apiBaseUrl}/api/downloads/\${fileName}\`);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = fileName;
a.click();`

      const curlCode = `curl -X GET "${apiBaseUrl}/api/downloads/batch-scrape-1234567890.md" \\
  --output batch-scrape-1234567890.md`

      return { pythonCode, jsCode, curlCode, codeId }
    }

    return { pythonCode: "", jsCode: "", curlCode: "", codeId }
  }

  const { pythonCode, jsCode, curlCode, codeId } = getCodeExamples()
  const currentCode =
    activeCodeLanguage === "python" ? pythonCode : activeCodeLanguage === "javascript" ? jsCode : curlCode

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:border-black hover:shadow-sm transition-all overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-5 gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <h3 className="text-lg sm:text-xl font-semibold text-black">{title}</h3>
              {badge && <span className="px-2 py-0.5 bg-black text-white text-xs font-medium rounded">{badge}</span>}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${methodColors[method]} inline-flex items-center justify-center w-fit`}
            >
              {method}
            </span>
            <code className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm font-mono text-black overflow-x-auto">
              {fullEndpoint}
            </code>
          </div>
          <button
            onClick={() => onCopy(fullEndpoint, endpoint)}
            className="sm:hidden w-full py-2 text-sm font-medium text-gray-700 hover:text-black bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 flex items-center justify-center gap-2"
            title="Copy to clipboard"
          >
            {copiedEndpoint === endpoint ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Endpoint</span>
              </>
            )}
          </button>
          <button
            onClick={() => onCopy(fullEndpoint, endpoint)}
            className="hidden sm:flex p-2.5 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-black flex-shrink-0 items-center justify-center"
            title="Copy to clipboard"
          >
            {copiedEndpoint === endpoint ? (
              <Check className="w-4 h-4 text-black" />
            ) : (
              <Copy className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Code Examples */}
        {pythonCode && (
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-black mb-3 uppercase tracking-wide">Code Examples</h4>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex border-b border-gray-200 overflow-x-auto">
                {[
                  { id: "python", label: "Python" },
                  { id: "javascript", label: "JavaScript" },
                  { id: "curl", label: "cURL" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setCodeLanguage(lang.id)}
                    className={`px-4 py-2.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      activeCodeLanguage === lang.id
                        ? "bg-black text-white"
                        : "text-gray-600 hover:text-black hover:bg-gray-50"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <div className="p-4 relative">
                <button
                  onClick={() => onCopy(currentCode, codeId)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-600 hover:text-black hover:bg-gray-100 rounded transition-colors font-medium z-10"
                  title="Copy code"
                >
                  {copiedEndpoint === codeId ? "Copied!" : "Copy"}
                </button>
                <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs sm:text-sm overflow-x-auto">
                  <code className="text-black">{currentCode}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        {request && (
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-black mb-2 uppercase tracking-wide">Request Body</h4>
            <pre className="bg-black text-white rounded-lg p-3 sm:p-4 text-xs sm:text-sm overflow-x-auto border border-gray-800">
              <code className="text-white">{JSON.stringify(request, null, 2)}</code>
            </pre>
          </div>
        )}

        {response && (
          <div>
            <h4 className="text-xs font-semibold text-black mb-2 uppercase tracking-wide">Response</h4>
            <pre className="bg-gray-50 text-black rounded-lg p-3 sm:p-4 text-xs sm:text-sm overflow-x-auto border border-gray-200">
              <code className="text-black">
                {typeof response === "string" ? response : JSON.stringify(response, null, 2)}
              </code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
