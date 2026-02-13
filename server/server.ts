import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.ts";
import { setupRoutes } from "./routes/index.ts";

// Configuración para obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env desde la carpeta del servidor
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// Middlewares básicos
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conectar MongoDB
await connectDB();

// Ruta principal
app.get("/", (req, res) => {
  res.json({
    message: "Servidor Piedra Papel Tijera",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      health: "/health",
      ranking: "/api/ranking",
      websocket: "ws://localhost:" + (process.env.PORT || 3000),
    },
  });
});

// Configurar rutas REST
setupRoutes(app);

// Puerto desde tu .env (3000)
const PORT = process.env.PORT || 3000;