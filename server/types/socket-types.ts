import type { GameChoice } from './game-types.ts';

export interface ServerToClientEvents {
  room_created: (data: { roomId: string; message: string; maxRounds: number }) => void;
  room_joined: (data: { roomId: string; players: string[]; maxRounds: number }) => void;
  start_round: (data: { roundNumber: number }) => void;
  round_result: (data: {
    playerChoice: GameChoice;
    opponentChoice: GameChoice;
    result: string;
    playerScore: number;
    opponentScore: number;
    player1Lives: number;
    player2Lives: number;
    roundEnded: boolean;
    roundNumber: number;
    isFinished: boolean;
  }) => void;
  waiting_action: (data: { message: string }) => void;
  match_finished: (data: {
    winner: string;
    finalScore: { player1: number; player2: number };
  }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { username: string; maxRounds?: 3 | 5 | 9 }) => void;
  join_room: (data: { roomId: string; username: string }) => void;
  player_choice: (data: { roomId: string; choice: GameChoice }) => void;
  player_action: (data: { roomId: string; action: 'rematch' | 'retire' }) => void;
}
