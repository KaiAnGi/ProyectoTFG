import type { Express } from "express";
import rankingRoutes from "./ranking-routes.ts";
import authRoutes from "./auth-routes.ts";
import friendsRoutes from "./friends-routes.ts";

export function setupRoutes(app: Express) {
  // Ruta de salud
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Rutas de la API
  app.use("/api/ranking", rankingRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/friends", friendsRoutes);

  console.log("Rutas configuradas");
}
