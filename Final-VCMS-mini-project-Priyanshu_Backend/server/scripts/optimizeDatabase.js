const mongoose = require("mongoose");
const User = require("./models/User");
const Appointment = require("./models/Appointment");
const Prescription = require("./models/Prescription");
const MedicalHistory = require("./models/MedicalHistory");
const Notification = require("./models/Notification");
const ChatMessage = require("./models/ChatMessage");
const VideoSession = require("./models/VideoSession");

/**
 * Database Index Optimization Script
 * Creates all necessary indices for production performance
 * Run with: npm run optimize-db
 */

const optimizeDatabase = async () => {
  try {
    console.log("🔄 Starting database index optimization...\n");

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/vcms";
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB\n");

    // Optimize each collection
    const models = [
      { name: "User", model: User },
      { name: "Appointment", model: Appointment },
      { name: "Prescription", model: Prescription },
      { name: "MedicalHistory", model: MedicalHistory },
      { name: "Notification", model: Notification },
      { name: "ChatMessage", model: ChatMessage },
      { name: "VideoSession", model: VideoSession },
    ];

    for (const { name, model } of models) {
      try {
        console.log(`📊 Optimizing ${name} collection...`);
        const result = await model.collection.getIndexes();
        console.log(`   Indices: ${Object.keys(result).length}`);

        // Create indices from schema definition
        await model.collection.createIndexes();
        console.log(`   ✅ ${name} indices created successfully\n`);
      } catch (error) {
        console.error(`   ❌ Error optimizing ${name}:`, error.message, "\n");
      }
    }

    // Get database stats
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📈 Database Statistics:`);
    console.log(`   Total collections: ${collections.length}`);

    for (const collection of collections) {
      const stats = await mongoose.connection.db
        .collection(collection.name)
        .stats();
      console.log(
        `   ${collection.name}: ${stats.count} documents, ${(
          stats.size / 1024 / 1024
        ).toFixed(2)} MB`
      );
    }

    console.log("\n✅ Database optimization completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database optimization failed:", error);
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  optimizeDatabase();
}

module.exports = optimizeDatabase;
