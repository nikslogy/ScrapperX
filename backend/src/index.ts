import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { connectDB } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { CrawlerController } from './controllers/crawlerController';

// Import routes
import scraperRoutes from './routes/scraperRoutes';
import healthRoutes from './routes/healthRoutes';
import crawlerRoutes from './routes/crawlerRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Ensure exports directory exists
async function initializeExportsDirectory() {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    await fs.mkdir(exportsDir, { recursive: true });
    console.log('📁 Exports directory initialized:', exportsDir);
  } catch (error) {
    console.error('❌ Failed to create exports directory:', error);
  }
}

// Database connection (optional for basic functionality)
if (process.env.MONGODB_URI) {
  connectDB().catch(console.error);
} else {
  console.log('📦 MongoDB connection skipped (no MONGODB_URI provided)');
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check
app.use('/health', healthRoutes);

// Download route for exported files
const crawlerController = new CrawlerController();
app.get('/api/downloads/:fileName', crawlerController.downloadExport);

// API routes
app.use('/api/scraper', scraperRoutes);
app.use('/api/crawler', crawlerRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 ScrapperX Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🌐 Listening on: 0.0.0.0:${PORT}`);
  
  // Initialize exports directory
  await initializeExportsDirectory();
});

export default app; 