const mongoose = require("mongoose");

const connectDB = async (retries = 5) => {
  try {
    const mongoUri = process.env.MONGODB_URI || 
                     process.env.MONGO_URI || 
                     "mongodb://localhost:27017/vcms";
    
    if (!mongoUri) {
      throw new Error("MONGODB_URI or MONGO_URI environment variable is not set");
    }
    
    console.log(`🔄 Attempting to connect to MongoDB...`);
    
    // Optimized connection options for MongoDB Atlas
    const connectionOptions = {
      serverSelectionTimeoutMS: 15000,     // 15 seconds for server selection (Atlas can be slower)
      socketTimeoutMS: 60000,               // 60 seconds for socket operations
      connectTimeoutMS: 15000,              // 15 seconds for initial connection
      family: 4,                            // Use IPv4 (fixes some connection issues)
      maxPoolSize: 10,                      // Max connection pool size
      minPoolSize: 2,                       // Min connection pool size
      retryWrites: true,                    // Enable automatic retries
      w: "majority",                        // Write concern
      maxIdleTimeMS: 45000,                 // Close idle connections after 45 seconds
      waitQueueTimeoutMS: 10000,            // Wait up to 10 seconds for a connection
    };
    
    await mongoose.connect(mongoUri, connectionOptions);
    
    console.log(`✅ MongoDB Atlas Connected Successfully`);
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Connection event handlers
    mongoose.connection.on("disconnected", () => {
      console.warn(`⚠️  MongoDB disconnected. Attempting to reconnect...`);
    });
    
    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });
    
    mongoose.connection.on("reconnected", () => {
      console.log(`✅ MongoDB reconnected successfully`);
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error(`❌ Database connection error: ${error.message}`);
    
    if (retries > 0) {
      console.log(`⏳ Retrying connection... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
      return connectDB(retries - 1);
    } else {
      console.error(`❌ Failed to connect to MongoDB Atlas after multiple retries`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
