# Changelog

All notable changes to ScrapperX will be documented in this file.

## [Unreleased]

### Changed
- **[BREAKING] Backend restructured to modular architecture**
  - Migrated from flat `controllers/`, `services/`, `utils/` directories to domain-oriented `modules/` structure
  - Each module now contains its own `controllers/`, `services/`, `validators/`, and `routes.ts`
  - Main entry point (`index.ts`) simplified to wire module routers and shared middleware

### Added
- New modular structure under `src/modules/`:
  - `scraper/` - Single-URL intelligent scraping (robots check, quick scrape, adaptive profiles)
  - `batch/` - Batch URL processing
  - `crawler/` - Domain crawling with session management
  - `export/` - Export and download management
  - `shared/` - Common type definitions
- Each module has dedicated validators using Joi schemas
- Barrel exports (`index.ts`) for clean module imports
- Architecture documentation in README.md

### Removed
- **Dead code removed:**
  - `services/patternRecognizer.ts` (was empty placeholder file)
- **Legacy directory structure removed:**
  - `src/controllers/` - replaced by module-specific controllers
  - `src/services/` - replaced by module-specific services
  - `src/utils/` - moved to `modules/scraper/services/`
  - `src/routes/scraperRoutes.ts` - replaced by `modules/scraper/routes.ts`
  - `src/routes/crawlerRoutes.ts` - replaced by `modules/crawler/routes.ts`

### Migration Notes
- All API endpoints remain unchanged and backward compatible
- Import paths have changed for internal use:
  - Old: `import { IntelligentScraper } from '../utils/intelligentScraper'`
  - New: `import { IntelligentScraper } from '../modules/scraper/services'`
- Module-level exports available via barrel files

---

## [1.0.0] - Previous Release

Initial release with:
- Intelligent scraping with multiple strategies (static, dynamic, stealth, adaptive, API)
- Batch scraping for multiple URLs
- Domain crawler with MongoDB persistence
- Export functionality (JSON, Markdown, ZIP)
- Rate limiting and error handling
