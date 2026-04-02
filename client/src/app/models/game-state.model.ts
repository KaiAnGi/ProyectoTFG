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
  opponentName: string | null;
  roundNumber: number;
  maxRounds: number;
  playerChoice: Choice | null;
  opponentChoice: Choice | null;
  playerScore: number;
  opponentScore: number;
  isWaitingOpponent: boolean;
  isRoundActive: boolean;
  history: RoundHistory[];
}

export interface PartialGameState {
  roomId?: string | null;
  playerName?: string;
  opponentName?: string | null;
  roundNumber?: number;
  maxRounds?: number;
  playerChoice?: Choice | null;
  opponentChoice?: Choice | null;
  playerScore?: number;
  opponentScore?: number;
  isWaitingOpponent?: boolean;
  isRoundActive?: boolean;
  history?: RoundHistory[];
}

export const INITIAL_GAME_STATE: GameState = {
  roomId: null,
  playerName: '',
  opponentName: null,
  roundNumber: 1,
  maxRounds: 10,
  playerChoice: null,
  opponentChoice: null,
  playerScore: 0,
  opponentScore: 0,
  isWaitingOpponent: false,
  isRoundActive: false,
  history: []
};
