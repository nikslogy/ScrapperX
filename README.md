# ScrapperX

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-success)

**Free web scraping API with intelligent extraction and markdown output**

[Try API](#-try-it-now) • [API Docs](#-api-documentation) • [Features](#-features) • [Self-Host](#-self-hosting)

</div>

---

## 🚀 What is ScrapperX?

ScrapperX is a **free, open-source web scraping API** that makes it easy to extract content from any website and get clean markdown output.

**Two ways to use it:**

1. **Use our hosted API** (with fair rate limits - free forever)
2. **Deploy your own instance** (unlimited requests)

## ✨ Features

- **🎯 Quick Scrape** - Single URL → Clean markdown (20 req/min)
- **📦 Batch Scrape** - Up to 10 URLs at once → Combined MD file (5 req/5min)  
- **🌐 Site Crawler** - Crawl entire domains up to 200 pages (3 req/5min)
- **🤖 Intelligent** - Auto-detects best scraping method
- **🔓 No Auth** - No API keys, no sign-up, just start using
- **📄 Markdown Output** - Perfect for docs and content pipelines

---

## 🔥 Try It Now

### Quick Scrape

```bash
curl -X POST https://your-api-url.com/api/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Batch Scrape (Multiple URLs)

```bash
curl -X POST https://your-api-url.com/api/scraper/batch-scrape \
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
curl -X POST https://your-api-url.com/api/crawler/start-domain-crawl \
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

Visit `/docs` on the hosted API or your local instance for complete interactive documentation with examples.

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

- **📚 Documentation Scraping** - Extract docs to markdown for offline use
- **📰 Content Aggregation** - Scrape multiple articles/posts at once
- **🔍 Research** - Gather data from multiple sources quickly
- **💾 Website Archiving** - Create markdown archives of websites
- **🤖 Data Collection** - Extract structured data for analysis

---

## 🏠 Self-Hosting

Want unlimited requests? Deploy your own instance!

### Quick Start

```bash
# Clone repository
git clone https://github.com/nikslogy/scrapperx
cd scrapperx

# Backend setup
cd backend
npm install
npx playwright install
cp env.example .env

# Start server
npm run dev
```

Backend runs on `http://localhost:5000`

### Production Deployment

For production deployment on your own server:

1. Set `NODE_ENV=production` in your `.env`
2. Build: `npm run build`
3. Start: `npm start`
4. Use a process manager like PM2
5. Setup reverse proxy (Nginx)
6. Configure SSL with Let's Encrypt

**When self-hosted, there are NO rate limits!**

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

## 🌟 Rate Limits (Hosted Service Only)

Our hosted service has fair rate limits to keep it free for everyone:

| Feature | Hosted Service | Self-Hosted |
|---------|---------------|-------------|
| Quick Scrape | 20 requests/min | ∞ Unlimited |
| Batch Scrape | 5 requests/5min | ∞ Unlimited |
| Crawler | 3 requests/5min | ∞ Unlimited |
| URLs per batch | 10 max | 100 max |
| Pages per crawl | 200 max | 10,000 max |

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

- **API Documentation**: Visit `/docs` on the hosted service
- **GitHub**: [View Source Code](https://github.com/yourusername/scrapperx)
- **Issues**: [Report Bugs](https://github.com/yourusername/scrapperx/issues)

---

<div align="center">

**Made with ❤️ for the web scraping community**

[⭐ Star on GitHub](https://github.com/nikslogy/scrapperx) • [🚀 Try the API](/) • [📖 Read Docs](/docs)

</div>
