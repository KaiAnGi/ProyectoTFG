export type Choice = 'rock' | 'paper' | 'scissors';
export type RoundResult = 'win' | 'lose' | 'tie';

export interface RoundHistory {
  round: number;
  playerChoice: Choice;
  opponentChoice: Choice;
  result: RoundResult;
}

export interface GameState {
  roomId: string | null;
  playerName: string;
  playerRole: 'player1' | 'player2' | null;
  opponentName: string | null;
  roundNumber: number;
  maxRounds: number;
  playerChoice: Choice | null;
  opponentChoice: Choice | null;
  playerScore: number;
  opponentScore: number;
  playerLives: number;
  opponentLives: number;
  isWaitingOpponent: boolean;
  isRoundActive: boolean;
  history: RoundHistory[];
}

export interface PartialGameState {
  roomId?: string | null;
  playerName?: string;
  playerRole?: 'player1' | 'player2' | null;
  opponentName?: string | null;
  roundNumber?: number;
  maxRounds?: number;
  playerChoice?: Choice | null;
  opponentChoice?: Choice | null;
  playerScore?: number;
  opponentScore?: number;
  playerLives?: number;
  opponentLives?: number;
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
  playerLives: 3,
  opponentLives: 3,
  isWaitingOpponent: false,
  isRoundActive: false,
  history: []
};
