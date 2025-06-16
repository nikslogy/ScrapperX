# 🚀 ScrapperX - AI-Powered Website Scraper

A modern, ethical website scraper with AI-powered content summarization. Built with Next.js, Express.js, and DeepSeek AI.

## ✨ Features

- **🔍 Smart Content Extraction**: Automatically identifies and extracts main content, titles, links, and metadata
- **🤖 AI Summarization**: Powered by DeepSeek AI for intelligent content summarization
- **⚖️ Ethical Compliance**: Automatic robots.txt checking and compliance reporting
- **⚡ Lightning Fast**: Optimized scraping with both static and dynamic content support
- **📊 Rich Results**: Comprehensive data extraction with multiple export formats
- **🛡️ Rate Limited**: Built-in rate limiting for responsible scraping
- **📱 Modern UI**: Beautiful, responsive interface built with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern styling
- **React Hooks** - State management

### Backend
- **Node.js + Express.js** - RESTful API server
- **TypeScript** - Type-safe backend development
- **Axios + Cheerio** - Static content scraping
- **Playwright** - Dynamic content scraping (planned)
- **MongoDB** - Data persistence (optional)
- **Rate Limiting** - Request throttling and abuse prevention

### AI Integration
- **DeepSeek API** - Content summarization (planned)
- **OpenRouter** - AI model access (planned)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MongoDB (optional, for data persistence)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ScrapperX
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install
   
   # Install backend dependencies
   cd ../backend && npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the `backend` directory:
   ```env
   NODE_ENV=development
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   MONGODB_URI=mongodb://localhost:27017/scrapperx
   
   # Optional: AI Integration
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENROUTER_MODEL=deepseek/deepseek-r1-0528:free
   ```

4. **Start the application**
   
   **Option 1: Start both services together (from root)**
   ```bash
   npm run dev
   ```
   
   **Option 2: Start services separately**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Health Check: http://localhost:5000/health

## 📖 Usage

### Web Interface

1. **Enter URL**: Paste the website URL you want to scrape
2. **Check Robots.txt** (Optional): Verify scraping permissions
3. **Scrape Website**: Extract content and metadata
4. **View Results**: Browse extracted content in organized tabs
5. **Export Data**: Download results as JSON or TXT

### API Endpoints

#### Health Check
```bash
GET /health
```

#### Check Robots.txt
```bash
POST /api/scraper/check-robots
Content-Type: application/json

{
  "url": "https://example.com",
  "userAgent": "ScrapperX-Bot"
}
```

#### Scrape Website
```bash
POST /api/scraper/scrape
Content-Type: application/json

{
  "url": "https://example.com",
  "options": {
    "userAgent": "Mozilla/5.0...",
    "timeout": 15000,
    "followRedirects": true,
    "maxRedirects": 5
  }
}
```

## 🏗️ Development Phases

### ✅ Phase 1: Foundation (COMPLETED)
- [x] Project structure setup
- [x] Next.js frontend with Tailwind CSS
- [x] Express.js backend API
- [x] Static HTML scraper (axios + cheerio)
- [x] Robots.txt checker
- [x] Basic UI components
- [x] API integration

### 🚧 Phase 2: AI Integration (IN PROGRESS)
- [ ] DeepSeek API integration
- [ ] Content summarization
- [ ] AI-powered content analysis

### 📋 Phase 3: Dynamic Content (PLANNED)
- [ ] Playwright integration
- [ ] JavaScript-rendered content scraping
- [ ] Fallback mechanisms

### 💾 Phase 4: Data Persistence (PLANNED)
- [ ] MongoDB integration
- [ ] User sessions
- [ ] Scraping history
- [ ] Project management

### 🔐 Phase 5: Authentication (PLANNED)
- [ ] User registration/login
- [ ] API key management
- [ ] Usage analytics
- [ ] Premium features

## 🔧 Configuration

### Rate Limiting
- **General API**: 50 requests/minute (dev), 10 requests/minute (prod)
- **Scraping**: 20 requests/5min (dev), 5 requests/5min (prod)

### Scraping Options
- **Timeout**: 15 seconds default
- **User Agent**: Configurable, defaults to modern browser
- **Redirects**: Up to 5 redirects followed
- **Content Types**: HTML, XHTML, XML

## 🛡️ Ethical Guidelines

ScrapperX is designed for responsible web scraping:

- ✅ **Respects robots.txt** - Automatic compliance checking
- ✅ **Rate limited** - Prevents server overload
- ✅ **User consent** - Requires user confirmation for scraping
- ✅ **Transparent** - Clear about scraping activities
- ⚠️ **User responsibility** - Users must ensure they have permission

## 📊 API Response Format

### Successful Response
```json
{
  "success": true,
  "data": {
    "url": "https://example.com",
    "title": "Page Title",
    "description": "Meta description",
    "content": "Main content text...",
    "links": [...],
    "images": [...],
    "headings": [...],
    "metadata": {...},
    "wordCount": 1234,
    "scrapedAt": "2025-01-16T...",
    "method": "static",
    "robotsCompliance": {...}
  },
  "timestamp": "2025-01-16T..."
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2025-01-16T..."
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** - React framework
- **Express.js** - Web framework for Node.js
- **Cheerio** - Server-side jQuery implementation
- **Tailwind CSS** - Utility-first CSS framework
- **DeepSeek** - AI model for content summarization
- **Playwright** - Browser automation (planned)

## 📞 Support

For support, email support@scrapperx.com or join our Discord community.

---

**⚠️ Disclaimer**: By using ScrapperX, you agree to scrape websites responsibly and in compliance with their terms of service and applicable laws. The developers are not responsible for misuse of this tool. 