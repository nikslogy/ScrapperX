/**
 * Modules barrel export
 * 
 * This file exports all module routers for easy integration in the main app.
 */

export { scraperRoutes } from './scraper';
export { batchRoutes } from './batch';
export { crawlerRoutes } from './crawler';
export { exportRoutes } from './export';

// Re-export shared types
export * from './shared';
