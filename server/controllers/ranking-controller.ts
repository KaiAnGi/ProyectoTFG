import type { Request, Response } from "express";
import { RankingService } from "../services/ranking-service.ts";

const rankingService = new RankingService();

// ! Peticiones que tendrá el cliente
export class RankingController {
  // Top 50 players in the leaderboard
  async getRanking(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const ranking = await rankingService.getTopRanking(limit);
      res.json(ranking);
    } catch (error) {
      res.status(500).json({
        error: "Error fetching the leaderboard",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Update a player's stats
  async updatePlayer(req: Request, res: Response): Promise<void> {
    try {
      const { playerName, won } = req.body;

      if (!playerName) {
        res.status(400).json({ error: "Player name is required" });
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
        error: "Error updating player",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Stats for a specific player
  async getPlayerStats(req: Request, res: Response): Promise<void> {
    try {
      const { playerName } = req.params;
      const player = await rankingService.getPlayerStats(playerName as string);

      if (!player) {
        res.status(404).json({ error: "Player not found" });
        return;
      }

      res.json(player);
    } catch (error) {
      res.status(500).json({
        error: "Error fetching player",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
