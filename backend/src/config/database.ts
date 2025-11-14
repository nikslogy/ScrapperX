import mongoose from 'mongoose';

// Check if MongoDB is connected
export const isMongoDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scrapperx';
    
    const conn = await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000, // Increased from 5000ms to 30000ms
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Added connection timeout
      bufferCommands: false, // Disable buffering to fail fast
    });

    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔐 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Don't exit - allow app to run without MongoDB
    console.log('⚠️ Running without MongoDB - crawler features will be limited');
  }
}; 