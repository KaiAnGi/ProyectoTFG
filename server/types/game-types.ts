export type GameChoice = "rock" | "paper" | "scissors";
export type GameResult = "player1" | "player2" | "tie";

export interface Player {
  id: string;
  name: string;
  roundsWon: number;
  choice?: GameChoice | null;
  cameraReady: boolean;
}

export interface GameRoom {
  roomId: string;
  player1: Player;
  player2: Player | null;
  roundNumber: number;
  maxRounds: number;
  // --- APUESTAS ---
  betAmount?: number;
  player1BetConfirmed?: boolean;
  player2BetConfirmed?: boolean;
 
}

export interface RoundResult {
  result: GameResult;
  player1Score: number;
  player2Score: number;
  roundWinner: "player1" | "player2" | "tie";
  roundWinnerName: string | null;
  player1Choice: GameChoice | null;
  player2Choice: GameChoice | null;
  roundNumber: number;
  isFinished: boolean;
}
