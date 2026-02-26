import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function resetDatabase() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/piedrapapeltijera",
    );
    console.log("✅ Connected to MongoDB\n");

    // Eliminar colección de usuarios
    console.log("🗑️  Dropping users collection...");
    await mongoose.connection.db.collection("users").drop().catch(() => {
      console.log("   Collection 'users' doesn't exist, skipping...");
    });

    // Eliminar colección de leaderboard
    console.log("🗑️  Dropping leaderboards collection...");
    await mongoose.connection.db
      .collection("leaderboards")
      .drop()
      .catch(() => {
        console.log("   Collection 'leaderboards' doesn't exist, skipping...");
      });

    console.log("\n✅ Database reset complete!");
    console.log("📋 Next time you create documents, indexes will be created automatically.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting database:", error.message);
    process.exit(1);
  }
}

resetDatabase();
