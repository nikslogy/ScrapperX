# ScrapperX

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-success)
![Security](https://img.shields.io/badge/security-SSRF%20protected-brightgreen)

**Free web scraping API with intelligent extraction and markdown output**

**[Try ScrapperX Live](https://scrapperx.run.place)** • **[API Documentation](https://scrapperx.run.place/docs)** • **[Features](#-features)** • **[Self-Host](#-self-hosting)**

</div>

---

## 🚀 What is ScrapperX?

ScrapperX is a **free, open-source web scraping API** that makes it easy to extract content from any website and get clean markdown output.

**Use our hosted service or deploy your own:**

1. **Hosted API** - Ready to use with fair rate limits (free forever)
2. **Self-Hosted** - Deploy your own instance with higher limits

## ✨ Features

- **Quick Scrape** - Single URL → Clean markdown
- **Batch Scrape** - Up to 10 URLs at once → Combined MD file
- **Site Crawler** - Crawl entire domains up to 200 pages
- **Intelligent** - Auto-detects best scraping method
- **Secure** - SSRF protection, rate limiting, optional API keys
- **Markdown Output** - Perfect for docs and content pipelines

---

## 🔐 API Access

ScrapperX uses a **tiered access** model:

| Feature | Free (No Key) | With API Key |
|---------|---------------|--------------|
| Quick Scrape | 3 requests/hour | 20 requests/min |
| Batch Scrape | 1 request/hour | 5 requests/5min |
| Site Crawler | ❌ Disabled | 3 requests/5min |

**Get an API Key:** Contact [nikitpotdar@gmail.com](mailto:nikitpotdar@gmail.com) or [self-host](#-self-hosting) for unlimited access.

### Using Your API Key

```bash
# Option 1: X-API-Key header (recommended)
curl -X POST https://scrapperx.run.place/api/scraper/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Key: scx_your-api-key" \
  -d '{"url": "https://example.com"}'

# Option 2: Authorization header
curl -X POST https://scrapperx.run.place/api/scraper/scrape \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer scx_your-api-key" \
  -d '{"url": "https://example.com"}'
```

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

### Website Crawler (Requires API Key)

```bash
curl -X POST https://scrapperx.run.place/api/crawler/start-domain-crawl \
  -H "Content-Type: application/json" \
  -H "X-API-Key: scx_your-api-key" \
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

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/scraper/scrape` | POST | Single URL scraping | Optional |
| `/api/scraper/batch-scrape` | POST | Batch scraping (10 URLs) | Optional |
| `/api/crawler/start-domain-crawl` | POST | Website crawler (200 pages) | **Required** |
| `/api/crawler/session/:id/export` | GET | Export crawl data | **Required** |
| `/api/downloads/:filename` | GET | Download generated files | Optional |
| `/health` | GET | Health check | No |

---

## 🎯 Use Cases

- **Documentation Scraping** - Extract docs to markdown for offline use
- **Content Aggregation** - Scrape multiple articles/posts at once
- **Research** - Gather data from multiple sources quickly
- **Website Archiving** - Create markdown archives of websites
- **Data Collection** - Extract structured data for analysis

---

## 🏠 Self-Hosting

For unlimited requests and full control, deploy your own instance:

### Quick Start

```bash
# Clone and setup
git clone https://github.com/nikslogy/ScrapperX
cd ScrapperX/backend
npm install
npx playwright install chromium
cp env.example .env
npm run dev
```

### Production Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for a complete secure deployment guide.

See **[PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md)** for API keys, database, and data retention info.

### Configuration

Create `backend/.env`:

```env
NODE_ENV=production
PORT=5000
TRUST_PROXY=true

# API Keys for authenticated users (comma-separated)
# Generate with: npm run generate-key
API_KEYS=scx_your-key-1,scx_your-key-2

# Frontend URL for CORS
FRONTEND_URL=https://your-domain.com

# Optional: MongoDB for crawler persistence
# MONGODB_URI=mongodb://localhost:27017/scrapperx

# Optional: CAPTCHA solving
# TWOCAPTCHA_API_KEY=your-key
```

### Generate API Keys

```bash
# Generate a new API key
cd backend
npm run generate-key
# Output: scx_abc123xyz...
```

---

## 🛡️ Security

ScrapperX includes the following security features:

| Feature | Description |
|---------|-------------|
| **SSRF Protection** | Blocks requests to internal IPs (localhost, 192.168.x.x, etc.) |
| **Path Traversal Protection** | Sanitized filenames for downloads |
| **Tiered Rate Limiting** | Different limits for anonymous vs authenticated |
| **Request Logging** | All requests logged for audit |
| **Security Event Logging** | Suspicious activity tracked |

---

## 💻 Technology

- **Node.js** + TypeScript
- **Express.js** - REST API
- **Playwright** - Browser automation  
- **Turndown** - HTML to Markdown
- **rate-limiter-flexible** - Rate limiting
- **Next.js** - Frontend UI (optional)

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
- **GitHub**: [View Source Code](https://github.com/nikslogy/ScrapperX)
- **Issues**: [Report Bugs](https://github.com/nikslogy/ScrapperX/issues)

---

<div align="center">

**Made with ❤️ for the web scraping community**

[⭐ Star on GitHub](https://github.com/nikslogy/ScrapperX) • [Try ScrapperX](https://scrapperx.run.place) • [API Docs](https://scrapperx.run.place/docs)

</div>
