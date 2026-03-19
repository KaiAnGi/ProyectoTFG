// models/leaderboard.ts
export interface ILeaderboard {
  _id?: string;
  playerName: string;
  consecutiveWins: number;
  createdAt?: string;
  updatedAt?: string;
}
