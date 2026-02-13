import type { Request, Response } from "express";
import { RankingService } from "../services/ranking-service.ts";

const rankingService = new RankingService();

// ! Peticiones que tendrá el cliente
export class RankingController {
  // 50 primeros jugadores del ranking
  async getRanking(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const ranking = await rankingService.getTopRanking(limit);
      res.json(ranking);
    } catch (error) {
      res.status(500).json({
        error: "Error al obtener el ranking",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  // Actualizar estadísticas de un jugador
  async updatePlayer(req: Request, res: Response): Promise<void> {
    try {
      const { playerName, won } = req.body;

      if (!playerName) {
        res.status(400).json({ error: "El nombre del jugador es obligatorio" });
        return;
      }

      const player = await rankingService.updatePlayerStats(
        playerName,
        won === true,
      );
      res.json({
        success: true,
        player,
      });
    } catch (error) {
      res.status(500).json({
        error: "Error al actualizar jugador",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }

  // Estadisticas de un jugador específico
  async getPlayerStats(req: Request, res: Response): Promise<void> {
    try {
      const { playerName } = req.params;
      const player = await rankingService.getPlayerStats(playerName as string);

      if (!player) {
        res.status(404).json({ error: "El jugador no fue encontrado" });
        return;
      }

      res.json(player);
    } catch (error) {
      res.status(500).json({
        error: "Error al obtener jugador",
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
