import Leaderboard from "../models/Leaderboard.ts";
import type { ILeaderboard } from "../models/Leaderboard.ts";

export class RankingService {
  async getTopRanking(limit: number = 50): Promise<ILeaderboard[]> {
    return await Leaderboard.find().sort({ consecutiveWins: -1 }).limit(limit);
  }

  async updatePlayerStats(
    playerName: string,
    won: boolean,
  ): Promise<ILeaderboard> {
    const player = await Leaderboard.findOne({ playerName });

    if (player) {
      if (won) {
        player.consecutiveWins += 1;
      } else {
        player.consecutiveWins = 0; // Se borra el conteo de victorias consecutivas si pierde
      }
      return await player.save();
    } else {
      // Crear nuevo jugador
      return await Leaderboard.create({
        playerName,
        consecutiveWins: won ? 1 : 0,
      });
    }
  }

  async getPlayerStats(playerName: string): Promise<ILeaderboard | null> {
    return await Leaderboard.findOne({ playerName });
  }
}
