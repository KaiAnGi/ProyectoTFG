// Tipos básicos del juego
export type Choice = 'rock' | 'paper' | 'scissors';
export type RoundResult = 'win' | 'lose' | 'tie';
export type GamePhase = 'waiting' | 'playing' | 'revealing' | 'finished';

// Estado de una ronda individual
export interface RoundHistory {
  round: number;
  playerChoice: Choice;
  opponentChoice: Choice;
  result: RoundResult;
  timestamp: Date;
}

// Estado completo del juego
export interface GameState {
  // Identificación
  roomId: string | null;
  playerName: string;
  opponentName: string | null;

  // Progreso del juego
  roundNumber: number;
  maxRounds: number;
  phase: GamePhase;

  // Elecciones actuales
  playerChoice: Choice | null;
  opponentChoice: Choice | null;

  // Puntuación
  playerScore: number;
  opponentScore: number;

  // Estados de control
  isWaitingOpponent: boolean;
  isRoundActive: boolean;
  canMakeChoice: boolean;
  isMatchFinished: boolean;

  // Historial
  history: RoundHistory[];

  // Mensajes del sistema
  systemMessage: string;
}

// Estado parcial para actualizaciones
export interface PartialGameState {
  roomId?: string | null;
  playerName?: string;
  opponentName?: string | null;
  roundNumber?: number;
  maxRounds?: number;
  phase?: GamePhase;
  playerChoice?: Choice | null;
  opponentChoice?: Choice | null;
  playerScore?: number;
  opponentScore?: number;
  isWaitingOpponent?: boolean;
  isRoundActive?: boolean;
  canMakeChoice?: boolean;
  history?: RoundHistory[];
  systemMessage?: string;
}

// Payloads de eventos del socket
export interface SocketRoomCreated {
  roomId: string;
  message: string;
}

export interface SocketRoomJoined {
  roomId: string;
  players: string[];
}

export interface SocketStartRound {
  roundNumber: number;
}

export interface SocketRoundResult {
  playerChoice: Choice;
  opponentChoice: Choice;
  result: RoundResult;
  playerScore: number;
  opponentScore: number;
  roundNumber: number;
  isFinished: boolean;
}

export interface SocketMatchFinished {
  winner: string | null;
  finalScore: {
    player1: number;
    player2: number;
  };
}

// Estado inicial por defecto
export const INITIAL_GAME_STATE: GameState = {
  roomId: null,
  playerName: '',
  opponentName: null,
  roundNumber: 1,
  maxRounds: 10,
  phase: 'waiting',
  playerChoice: null,
  opponentChoice: null,
  playerScore: 0,
  opponentScore: 0,
  isWaitingOpponent: false,
  isRoundActive: false,
  canMakeChoice: false,
  isMatchFinished: false,
  history: [],
  systemMessage: ''
};

// Utilidades para el modelo
export class GameStateUtils {
  static createRoundHistory(
    round: number,
    playerChoice: Choice,
    opponentChoice: Choice,
    result: RoundResult
  ): RoundHistory {
    return {
      round,
      playerChoice,
      opponentChoice,
      result,
      timestamp: new Date()
    };
  }

  static calculateWinner(player: Choice, opponent: Choice): RoundResult {
    if (player === opponent) return 'tie';

    const winCombos: Record<Choice, Choice[]> = {
      rock: ['scissors'],
      paper: ['rock'],
      scissors: ['paper']
    };

    return winCombos[player]?.includes(opponent!) ? 'win' : 'lose';
  }

  static isGameFinished(state: GameState): boolean {
    return state.roundNumber > state.maxRounds ||
           state.playerScore >= 5 ||
           state.opponentScore >= 5;
  }
}
