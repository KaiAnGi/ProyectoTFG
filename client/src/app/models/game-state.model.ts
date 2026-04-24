export type Choice = 'rock' | 'paper' | 'scissors';
export type RoundResult = 'win' | 'lose' | 'tie';

export interface RoundHistory {
  round: number;
  playerChoice: Choice | null;
  opponentChoice: Choice | null;
  result: RoundResult;
  winnerName: string | null;
}

export interface GameState {
  roomId: string | null;
  roomName: string;
  playerName: string;
  playerRole: 'player1' | 'player2' | null;
  opponentName: string | null;
  roundNumber: number;
  maxRounds: number;
  playerChoice: Choice | null;
  opponentChoice: Choice | null;
  playerScore: number;
  opponentScore: number;
  roundTimeLeftSec: number;
  lastRoundResult: RoundResult | null;
  lastRoundWinnerName: string | null;
  isMatchFinished: boolean;
  matchWinnerName: string | null;
  isWaitingOpponent: boolean;
  isRoundActive: boolean;
  history: RoundHistory[];
}

export interface PartialGameState {
  roomId?: string | null;
  roomName?: string;
  playerName?: string;
  playerRole?: 'player1' | 'player2' | null;
  opponentName?: string | null;
  roundNumber?: number;
  maxRounds?: number;
  playerChoice?: Choice | null;
  opponentChoice?: Choice | null;
  playerScore?: number;
  opponentScore?: number;
  roundTimeLeftSec?: number;
  lastRoundResult?: RoundResult | null;
  lastRoundWinnerName?: string | null;
  isMatchFinished?: boolean;
  matchWinnerName?: string | null;
  isWaitingOpponent?: boolean;
  isRoundActive?: boolean;
  history?: RoundHistory[];
}

export const INITIAL_GAME_STATE: GameState = {
  roomId: null,
  playerName: '',
  playerRole: null,
  opponentName: null,
  roundNumber: 1,
  maxRounds: 3,
  playerChoice: null,
  opponentChoice: null,
  playerScore: 0,
  opponentScore: 0,
  roundTimeLeftSec: 0,
  lastRoundResult: null,
  lastRoundWinnerName: null,
  isMatchFinished: false,
  matchWinnerName: null,
  isWaitingOpponent: false,
  roomName: '',
  isRoundActive: false,
  history: [],
};
