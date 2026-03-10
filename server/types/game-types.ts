export type GameChoice = 'rock' | 'paper' | 'scissors';
export type GameResult = 'player1' | 'player2' | 'tie';
export type PlayerAction = 'rematch' | 'retire';

export interface Player {
  id: string;
  name: string;
  consecutiveWins: number;
  choice?: GameChoice | null;
  action?: PlayerAction | null;
}

export interface GameRoom {
  roomId: string;
  player1: Player;
  player2: Player | null;
  roundNumber: number;
  maxRounds: number;
  waitingForChoices: Set<string>;
  waitingForActions: Set<string>;
}

export interface RoundResult {
  result: GameResult;
  player1Score: number;
  player2Score: number;
  roundNumber: number;
  isFinished: boolean;
  winner?: string;
  player1Choice: GameChoice;
  player2Choice: GameChoice;
}
