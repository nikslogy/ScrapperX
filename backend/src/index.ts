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
import { requestLogger } from './middleware/requestLogger';
import { sanitizeFilename } from './utils/urlValidator';

// Import routes
import scraperRoutes from './routes/scraperRoutes';
import healthRoutes from './routes/healthRoutes';
import crawlerRoutes from './routes/crawlerRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Ensure required directories exist
async function initializeDirectories() {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    const logsDir = path.join(process.cwd(), 'logs');

    await fs.mkdir(exportsDir, { recursive: true });
    await fs.mkdir(logsDir, { recursive: true });

    console.log('📁 Directories initialized');
  } catch (error) {
    console.error('❌ Failed to create directories:', error);
  }
}

// Database connection (optional for basic functionality)
if (process.env.MONGODB_URI) {
  connectDB().catch(console.error);
} else {
  console.log('📦 MongoDB connection skipped (no MONGODB_URI provided)');
}

// ============================
// Security Middleware (ORDER MATTERS!)
// ============================

// 1. Helmet for security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev
}));

// 2. Trust proxy if behind reverse proxy (Nginx, etc.)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// 3. Request logging (BEFORE other middleware for timing)
app.use(requestLogger);

// 4. Compression
app.use(compression());

// 5. CORS configuration - STRICT in production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// Add production domain if set
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Allow if origin is in the allowed list
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      return callback(null, true);
    }

    // In development, allow all origins
    if (!isProduction) {
      return callback(null, true);
    }

    // In production, allow but log warning
    console.warn(`⚠️ CORS: Request from unknown origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
}));

// 6. Body parsing middleware with size limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 7. Rate limiting with API key detection (hybrid approach)
// - Anonymous users: Limited access (try the API)
// - API key users: Full access
// Note: API key validation is built into the rate limiter now
app.use('/api/', rateLimiter);


// ============================
// Routes
// ============================

// Health check (no rate limiting or auth)
app.use('/health', healthRoutes);

// SECURE Download route for exported files
app.get('/api/downloads/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;

    if (!fileName) {
      res.status(400).json({ success: false, message: 'File name is required' });
      return;
    }

    // CRITICAL: Sanitize filename to prevent path traversal
    let sanitizedFileName: string;
    try {
      sanitizedFileName = sanitizeFilename(fileName);
    } catch (error) {
      console.warn('🚨 Path traversal attempt blocked:', fileName);
      res.status(400).json({ success: false, message: 'Invalid filename' });
      return;
    }

    // Only allow specific extensions
    const allowedExtensions = ['.md', '.json', '.csv', '.zip'];
    const ext = path.extname(sanitizedFileName).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      res.status(400).json({ success: false, message: 'File type not allowed' });
      return;
    }

    const filePath = path.join(process.cwd(), 'exports', sanitizedFileName);

    // Verify the resolved path is within exports directory
    const exportsDir = path.resolve(process.cwd(), 'exports');
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(exportsDir)) {
      console.warn('🚨 Path escape attempt blocked:', fileName);
      res.status(400).json({ success: false, message: 'Invalid file path' });
      return;
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }

    // Set appropriate headers
    const mimeTypes: { [key: string]: string } = {
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.md': 'text/markdown',
      '.zip': 'application/zip'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
    res.sendFile(resolvedPath);

  } catch (error) {
    console.error('Error downloading export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

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

// ============================
// Cleanup & Maintenance
// ============================

// Automatic cleanup function for old export files
async function cleanupOldExports() {
  try {
    const exportsDir = path.join(process.cwd(), 'exports');
    const files = await fs.readdir(exportsDir);
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    let deletedCount = 0;
    for (const file of files) {
      const filePath = path.join(exportsDir, file);
      const stats = await fs.stat(filePath);

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

// Graceful shutdown handler
function setupGracefulShutdown() {
  const shutdown = async (signal: string) => {
    console.log(`\n📴 Received ${signal}. Starting graceful shutdown...`);

    // Give existing requests time to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('👋 Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ============================
// Server Startup
// ============================

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 ScrapperX Backend Server`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Environment: ${isProduction ? 'PRODUCTION' : 'development'}`);
  console.log(`🌐 Listening on: http://0.0.0.0:${PORT}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔐 API Key Required: ${process.env.REQUIRE_API_KEY === 'true' ? 'YES' : 'NO'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Initialize directories
  await initializeDirectories();

  // Run initial cleanup
  await cleanupOldExports();

  // Schedule cleanup every 24 hours
  setInterval(cleanupOldExports, 24 * 60 * 60 * 1000);

  // Setup graceful shutdown
  setupGracefulShutdown();
});

export default app;