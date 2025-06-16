import ScrapperInterface from '@/components/ScrapperInterface';

export default function Home() {
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
                <p className="text-sm text-gray-600">AI-Powered Website Scraper</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✨ MVP Ready
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
              AI Precision
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Simply paste any URL and get structured, summarized content. Our intelligent scraper handles both static and dynamic websites while respecting robots.txt.
          </p>
          
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              🤖 AI-Powered Summarization
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ⚡ Lightning Fast
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              📋 Multiple Export Formats
            </span>
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
              🛡️ Ethical Scraping
            </span>
          </div>
        </div>

        {/* Main Scrapper Interface */}
        <ScrapperInterface />
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Content Extraction</h3>
            <p className="text-gray-600">
              Automatically identifies and extracts the main content, titles, links, and metadata from any webpage.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🧠</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Summarization</h3>
            <p className="text-gray-600">
              Powered by DeepSeek AI to provide concise, relevant summaries of extracted content.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚖️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ethical Compliance</h3>
            <p className="text-gray-600">
              Automatically checks robots.txt and respects website scraping policies for responsible data extraction.
            </p>
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
              © 2025 ScrapperX. Built with Next.js, Express.js, and DeepSeek AI.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
