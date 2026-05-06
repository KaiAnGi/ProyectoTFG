import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.ts";
import { setupRoutes } from "./routes/index.ts";
import { initializeSocketIO } from "./sockets/index.ts";
import paypalRoutes from "./routes/paypal.routes.ts";
import { authMiddleware } from "./middleware/auth-middleware.ts";

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
    credentials: false,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/paypal", authMiddleware, paypalRoutes);

// Conectar MongoDB
await connectDB();

// Ruta principal
app.get("/", (req, res) => {
  res.json({
    message: "Servidor RPS Buckshot Roulette",
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

// Inicializar Socket.IO y crear servidor HTTP
const httpServer = initializeSocketIO(app);

// Puerto desde tu .env (3000)
const PORT = process.env.PORT || 3000;

httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log("\n============================================");
  console.log("Servidor RPS iniciado exitosamente");
  console.log(`HTTP/REST: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`Ranking API: http://localhost:${PORT}/api/ranking`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("============================================\n");
});