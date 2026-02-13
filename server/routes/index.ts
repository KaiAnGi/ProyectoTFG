import type { Express } from "express";
import rankingRoutes from "./ranking-routes.ts";

export function setupRoutes(app: Express) {
  // Ruta de salud
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Rutas de la API
  app.use("/api/ranking", rankingRoutes);

  console.log("Rutas configuradas");
}
