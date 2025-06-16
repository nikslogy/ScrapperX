# 🧠 AI-Powered Website Scraper - MVP Plan

## 🚀 Objective

Build a SaaS platform where users input a URL and receive structured, summarized content scraped from the website. The system should support static and JS-based websites with optional AI summarization.

---

## ✅ Core Features (MVP)

1. Input URL form
2. Static HTML scraper (text + links + titles)
3. Dynamic content support (using headless browser)
4. Summary generation using DeepSeek API
5. Downloadable results (JSON, PDF, TXT)
6. Simple dashboard with project history (user login optional)
7. Robots.txt checker

---

## 🛠️ Tech Stack

### Frontend

* **Framework**: Next.js (React + SSR)
* **Styling**: Tailwind CSS
* **State Management**: Zustand or Context API

### Backend

* **Language**: Node.js (Express.js)
* **Scraper Engine**:

  * `axios` + `cheerio` for static scraping
  * `playwright` for dynamic websites
* **AI Integration**: deepseek/deepseek-r1-0528:free (openrouter) (text summarization)

### Database

* **DB**: MongoDB (Mongoose)
* **Auth**: Firebase Auth or JWT-based custom auth

### Storage

* **Temporary File Storage**: DigitalOcean Spaces or AWS S3
* **User Projects/Results**: Stored in MongoDB with document references

### Queue System (Optional for scale)

* **Job Queue**: BullMQ with Redis

### DevOps

* **Hosting**:

  * Frontend: Vercel
  * Backend: DigitalOcean Droplet or Railway.app
* **Monitoring**: LogRocket (frontend), Sentry (backend)

---

## 🏗️ System Architecture

```text
+-----------------+         +------------------------+         +--------------------------+
|                 |  URL    |                        |  HTML   |                          |
|     Frontend    +-------->+     Express.js API     +-------->+     Static Scraper       |
|  (Next.js App)  |         |   (Node.js Backend)    |         | (axios + cheerio)        |
|                 |         |                        |         |                          |
+-------+---------+         +----------------+-------+         +-----+------------+--------+
                                            |                         |            |
                                            |                         |            +-----------------------------+
                                            |                         |                                          |
                                            v                         v                                          v
                                +--------------------+    +--------------------------+            +------------------------+
                                |  Robots.txt Parser |    | Headless Scraper (JS)   |            | AI Summarizer (GPT-4) |
                                +--------------------+    |  (Playwright)           |            +------------------------+
                                                         +-----------+--------------+
                                                                     |
                                                                     v
                                                          +---------------------------+
                                                          | Result Formatter & Saver |
                                                          | (PDF, JSON, TXT Export)   |
                                                          +---------------------------+
                                                                     |
                                                                     v
                                                         +----------------------------+
                                                         | MongoDB + S3/Spaces Store |
                                                         +----------------------------+
```

---

## 🧪 Development Phases

### Phase 1: Basic Static Scraper

* Input URL
* Scrape using `axios` + `cheerio`
* Display raw content
* Save and export results

### Phase 2: AI Summary

* Integrate deepseek/deepseek-r1-0528:free (openrouter) summarization
* Add summarization toggle per page

### Phase 3: Dynamic Scraper

* Integrate `playwright` for JS-rendered sites
* Use fallback if static fails

### Phase 4: Project Dashboard

* Store scraped projects
* Login system (basic Firebase Auth)

### Phase 5: Polish & Prepare for Beta

* UI refinement
* PDF/JSON download
* Basic usage analytics

---

## 📁 Folder Structure (Backend)

```
server/
├── controllers/
├── routes/
├── utils/
│   ├── staticScraper.js
│   ├── dynamicScraper.js
│   ├── summarizer.js
│   ├── robotsChecker.js
├── models/
├── services/
├── index.js
```

---

## 🔐 Notes on Ethics & Legality

* Show robots.txt status before scraping
* Add disclaimer: “By using this tool, you confirm that you have permission to scrape the given website.”
* Respect user rate limits and implement delays

---

## 🎯 Future Add-ons

* Proxy rotation for protection
* Smart foldering and tagging
* Scheduled scrapes (cron)
* API access for developers
* Semantic search in scraped results

---

Let me know when you're ready to start development, and I can help generate full code modules, UI designs, or deploy instructions!
