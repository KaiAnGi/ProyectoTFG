// models/leaderboard.ts
export interface ILeaderboard {
  _id?: string;
  playerName: string;
  matchVictories: number;
  createdAt?: string;
  updatedAt?: string;
}
