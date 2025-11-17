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
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://scrapperx.run.place',
  'http://scrapperx.run.place',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow if origin is in the allowed list
    if (allowedOrigins.some(allowed => origin.startsWith(allowed as string))) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Block if not allowed
    callback(new Error('Not allowed by CORS'));
  },
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

// Automatic cleanup function for old export files
async function cleanupOldExports() {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    const files = await fs.readdir(exportsDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    
    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(exportsDir, file);
      const stats = await fs.stat(filePath);
      
      // Delete files older than 7 days
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`🗑️ Deleted old export: ${file}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ Cleanup completed: ${deletedCount} old files deleted`);
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 ScrapperX Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🌐 Listening on: 0.0.0.0:${PORT}`);
  
  // Initialize exports directory
  await initializeExportsDirectory();
  
  // Run initial cleanup
  await cleanupOldExports();
  
  // Schedule cleanup every 24 hours
  setInterval(cleanupOldExports, 24 * 60 * 60 * 1000);
  console.log('🧹 Automatic cleanup scheduled (every 24 hours)');
});

export default app; 