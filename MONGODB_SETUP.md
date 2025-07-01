# MongoDB Setup Guide for ScrapperX Crawler Testing

## Quick Setup Options

### Option 1: MongoDB Atlas (Cloud - Recommended for Testing)

1. **Create Free Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account
   - Create a new cluster (free tier available)

2. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password

3. **Update Environment**
   ```bash
   # Create .env file in backend/ directory
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/scrapperx
   ```

4. **Test Connection**
   ```bash
   cd backend
   npm run dev
   # In another terminal:
   node test-crawler-phase1.js
   ```

### Option 2: Local MongoDB Installation

#### Windows
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Install with default settings
3. Start MongoDB service:
   ```cmd
   net start MongoDB
   ```
4. Create .env file:
   ```
   MONGODB_URI=mongodb://localhost:27017/scrapperx
   ```

#### macOS (with Homebrew)```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community```

#### Linux (Ubuntu/Debian)
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### Option 3: Docker (Easiest for Development)

1. **Create docker-compose.yml** in project root:
   ```yaml
   version: '3.8'
   services:
     mongodb:
       image: mongo:6.0
       container_name: scrapperx-mongo
       restart: always
       ports:
         - "27017:27017"
       environment:
         MONGO_INITDB_DATABASE: scrapperx
       volumes:
         - mongodb_data:/data/db

   volumes:
     mongodb_data:
   ```

2. **Start MongoDB**:
   ```bash
   docker-compose up -d mongodb
   ```

3. **Update .env**:
   ```
   MONGODB_URI=mongodb://localhost:27017/scrapperx
   ```

## Testing the Setup

Once MongoDB is running:

1. **Start Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Run Phase 1 Tests**:
   ```bash
   # Basic connectivity
   node test-simple-crawler.js
   
   # Full Phase 1 functionality
   node test-crawler-phase1.js
   ```

3. **Expected Test Output**:
   ```
   🧪 Testing Phase 1: Domain Crawler Foundation
   ================================================
   Test 1: Starting domain crawl...
   ✅ Crawl started successfully
      Session ID: abc-123-def
   
   Test 2: Monitoring crawl progress...
   ✅ Crawl completed
   
   Test 3: Getting extracted content...
   ✅ Retrieved X content items
   
   Test 4: Exporting session data...
   ✅ Export successful
   
   🏁 Phase 1 Testing Complete
   ```

## Troubleshooting

### Connection Issues
- **Error**: `MongoServerError: Authentication failed`
  - Check username/password in connection string
  - Ensure database user has read/write permissions

- **Error**: `MongoNetworkError: connect ECONNREFUSED`
  - Verify MongoDB is running
  - Check connection string format
  - Ensure port 27017 is accessible

### Performance Issues
- **Slow Crawling**: Increase delay in crawler config
- **Memory Issues**: Reduce concurrent workers
- **Large Data**: Consider MongoDB indexing optimization

## Environment Variables

Create `backend/.env` file:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/scrapperx

# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Optional: For production
OPENROUTER_API_KEY=your_api_key_here
```

## Next Steps After Setup

1. ✅ Run full Phase 1 tests
2. ✅ Verify all crawler functionality
3. 🚀 Ready to proceed to Phase 2 (AI Content Analysis)

## Support

If you encounter issues:
1. Check MongoDB logs
2. Verify network connectivity
3. Test with MongoDB Compass (GUI tool)
4. Check ScrapperX backend logs for detailed errors 

