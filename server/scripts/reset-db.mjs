import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/*
  Script de preparación para pruebas (reset de base de datos).

  Qué hace:
  - Conecta contra MongoDB usando MONGODB_URI o la URI local por defecto.
  - Elimina las colecciones `users` y `leaderboards` si existen.
  - Deja la base limpia para ejecutar smoke tests de registro, login y ranking
    sin interferencias de datos anteriores.

  Cómo funciona:
  1) Resuelve la ruta del archivo actual para cargar `../.env` de forma fiable.
  2) Abre conexión con Mongoose.
  3) Intenta hacer `drop()` de cada colección; si no existe, registra mensaje
     informativo y continúa (no falla por ese motivo).
  4) Cierra la conexión y termina con código 0 en éxito.
  5) Si ocurre cualquier error real de conexión/operación, imprime el motivo y
     finaliza con código 1.

  Uso típico:
  - Ejecutar antes de los smoke tests para empezar desde estado conocido.
*/

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
