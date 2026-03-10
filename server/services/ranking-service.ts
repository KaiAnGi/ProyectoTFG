import Leaderboard from "../models/Leaderboard.ts";
import type { ILeaderboard } from "../models/Leaderboard.ts";

export class RankingService {
  async getTopRanking(limit: number = 50): Promise<ILeaderboard[]> {
    return await Leaderboard.find().sort({ matchVictories: -1 }).limit(limit);
  }

  async updatePlayerStats(
    playerName: string,
    won: boolean,
  ): Promise<ILeaderboard> {
    const player = await Leaderboard.findOne({ playerName });

    if (player) {
      if (won) {
        player.matchVictories += 1;
      }
      // If lost, matchVictories stays the same (no reset)
      return await player.save();
    } else {
      // Crear nuevo jugador
      return await Leaderboard.create({
        playerName,
        matchVictories: won ? 1 : 0,
      });
    }
  }

  async getPlayerStats(playerName: string): Promise<ILeaderboard | null> {
    return await Leaderboard.findOne({ playerName });
  }
}
