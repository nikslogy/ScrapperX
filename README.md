# ScrapperX

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-success)

**Free web scraping API with intelligent extraction and markdown output**

**[Try ScrapperX Live](https://scrapperx.run.place)** • **[API Documentation](https://scrapperx.run.place/docs)** • **[Features](#-features)** • **[Self-Host](#-self-hosting-optional)**

</div>

---

## 🚀 What is ScrapperX?

ScrapperX is a **free, open-source web scraping API** that makes it easy to extract content from any website and get clean markdown output.

**Use our hosted service or deploy your own:**

1. **Hosted API** - Ready to use with fair rate limits (free forever)
2. **Self-Hosted** - Deploy your own instance for unlimited requests

## ✨ Features

- **Quick Scrape** - Single URL → Clean markdown (20 req/min)
- **Batch Scrape** - Up to 10 URLs at once → Combined MD file (5 req/5min)
- **Site Crawler** - Crawl entire domains up to 200 pages (3 req/5min)
- **Intelligent** - Auto-detects best scraping method
- **No Auth** - No API keys, no sign-up, just start using
- **Markdown Output** - Perfect for docs and content pipelines

---

## 🔥 Try It Now

**[Try ScrapperX Live](https://scrapperx.run.place)** • **[API Documentation](https://scrapperx.run.place/docs)**

### Quick Scrape

```bash
curl -X POST https://scrapperx.run.place/api/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Batch Scrape (Multiple URLs)

```bash
curl -X POST https://scrapperx.run.place/api/scraper/batch-scrape \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://example.org"
    ]
  }'
```

Returns a download link to a markdown file with all scraped content!

### Website Crawler

```bash
curl -X POST https://scrapperx.run.place/api/crawler/start-domain-crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "config": {
      "maxPages": 50,
      "maxDepth": 3
    }
  }'
```

---

## 📖 API Documentation

Visit **[scrapperx.run.place/docs](https://scrapperx.run.place/docs)** for complete interactive documentation with examples.

### Available Endpoints

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/scraper/scrape` | POST | Single URL scraping | 20/min |
| `/api/scraper/batch-scrape` | POST | Batch scraping (10 URLs) | 5/5min |
| `/api/crawler/start-domain-crawl` | POST | Website crawler (200 pages) | 3/5min |
| `/api/crawler/session/:id/export` | GET | Export crawl data | - |
| `/api/downloads/:filename` | GET | Download generated files | - |

---

## 🎯 Use Cases

- **Documentation Scraping** - Extract docs to markdown for offline use
- **Content Aggregation** - Scrape multiple articles/posts at once
- **Research** - Gather data from multiple sources quickly
- **Website Archiving** - Create markdown archives of websites
- **Data Collection** - Extract structured data for analysis

---

## 🏠 Self-Hosting (Optional)

For unlimited requests without rate limits, you can deploy your own instance:

```bash
# Clone and setup
git clone https://github.com/nikslogy/scrapperx
cd scrapperx/backend
npm install
npx playwright install
cp env.example .env
npm run dev
```
---

## 🔧 Configuration

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000

# Optional: MongoDB for crawler persistence
# MONGODB_URI=mongodb://localhost:27017/scrapperx

# Optional: CAPTCHA solving
# TWOCAPTCHA_API_KEY=your-key
```

---

## 🌟 Rate Limits

Our hosted service has fair rate limits to keep it free for everyone:

| Feature | Rate Limit | Description |
|---------|------------|-------------|
| Quick Scrape | 20 requests/min | Single URL scraping |
| Batch Scrape | 5 requests/5min | Up to 10 URLs at once |
| Site Crawler | 3 requests/5min | Up to 200 pages per crawl |
| URLs per batch | 10 max | Maximum URLs in one request |
| Pages per crawl | 200 max | Maximum pages per crawl |

**Self-host for unlimited requests!**

---

## 💻 Technology

- **Node.js** + TypeScript
- **Express.js** - REST API
- **Playwright** - Browser automation  
- **Turndown** - HTML to Markdown
- **rate-limiter-flexible** - Rate limiting
- **Next.js** - Frontend UI (optional)

---

## 🏗️ Backend Architecture

The backend follows a modular, domain-oriented architecture for maintainability and scalability:

```
backend/src/
├── config/                    # Shared configuration
│   └── database.ts            # MongoDB connection
├── middleware/                # Shared middleware
│   ├── errorHandler.ts        # Global error handling
│   └── rateLimiter.ts         # Rate limiting (general, scrape, batch, crawler)
├── models/                    # Shared data models
│   └── crawlerModels.ts       # Mongoose schemas (CrawlSession, UrlQueue, RawContent, CrawlPattern)
├── modules/                   # Domain-oriented modules
│   ├── scraper/               # Single-URL scraping module
│   │   ├── controllers/       # robots, quickScrape, adaptiveProfiles
│   │   ├── services/          # intelligentScraper, staticScraper, dynamicScraper,
│   │   │                      # stealthScraper, adaptiveScraper, apiScraper, robotsChecker
│   │   ├── validators/        # Joi validation schemas
│   │   ├── routes.ts          # Module router
│   │   └── index.ts           # Barrel export
│   ├── batch/                 # Batch scraping module
│   │   ├── controllers/       # batch.controller
│   │   ├── validators/        # Batch validation schema
│   │   ├── routes.ts          # Module router
│   │   └── index.ts           # Barrel export
│   ├── crawler/               # Domain crawling module
│   │   ├── controllers/       # session, content, structuredData, authentication, analytics
│   │   ├── services/          # domainCrawler, urlQueue, contentExtractor,
│   │   │                      # authenticationHandler, structuredExtractor
│   │   ├── validators/        # Crawler validation schemas
│   │   ├── routes.ts          # Module router
│   │   └── index.ts           # Barrel export
│   ├── export/                # Export/download module
│   │   ├── controllers/       # export.controller
│   │   ├── services/          # exportService + exporters (JSON, Markdown)
│   │   ├── routes.ts          # Module router
│   │   └── index.ts           # Barrel export
│   ├── shared/                # Shared types across modules
│   │   └── types/             # Common interfaces
│   └── index.ts               # Central module exports
├── routes/
│   └── healthRoutes.ts        # Health check endpoint
└── index.ts                   # Application entry point (wires modules + middleware)
```

### Module Responsibilities

| Module | Description |
|--------|-------------|
| **scraper** | Single-URL intelligent scraping with adaptive strategy selection, robots.txt checking, and profile management |
| **batch** | Multi-URL batch processing with combined output generation |
| **crawler** | Domain-wide crawling with queue management, Playwright workers, content extraction, and session persistence |
| **export** | Data export in multiple formats (JSON, Markdown, ZIP), download management, and history tracking |
| **shared** | Common type definitions used across modules |

---

## 📝 License

MIT License - free to use, modify, and distribute.

---

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs via GitHub Issues
- Submit pull requests
- Suggest new features

---

## ⚠️ Disclaimer

This tool is for educational and legitimate use only. Users are responsible for:
- Respecting website Terms of Service
- Following robots.txt guidelines (optional flag available)
- Complying with applicable laws
- Not overwhelming target servers

Scrape responsibly!

---

## 🔗 Links

- **Live API**: [scrapperx.run.place](https://scrapperx.run.place)
- **API Documentation**: [scrapperx.run.place/docs](https://scrapperx.run.place/docs)
- **GitHub**: [View Source Code](https://github.com/nikslogy/scrapperx)
- **Issues**: [Report Bugs](https://github.com/nikslogy/scrapperx/issues)

---

<div align="center">

**Made with ❤️ for the web scraping community**

[⭐ Star on GitHub](https://github.com/nikslogy/scrapperx) • [Try ScrapperX](https://scrapperx.run.place) • [API Docs](https://scrapperx.run.place/docs)

</div>
