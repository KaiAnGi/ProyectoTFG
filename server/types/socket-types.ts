import type { GameChoice } from "./game-types.ts";
import type { ILeaderboard } from "../models/Leaderboard.ts";

export interface ServerToClientEvents {
  "leaderboard:update": (data: ILeaderboard[]) => void;
  room_created: (data: {
    roomId: string;
    message: string;
    maxRounds: number;
    playerRole: "player1";
    playerName: string;
    opponentName: null;
  }) => void;
  room_joined: (data: {
    roomId: string;
    maxRounds: number;
    playerRole: "player1" | "player2";
    playerName: string;
    opponentName: string | null;
  }) => void;
  start_round: (data: { roundNumber: number; timeLimitSec: number }) => void;
  round_timer: (data: { timeLeftSec: number }) => void;
  round_result: (data: {
    playerChoice: GameChoice | null;
    opponentChoice: GameChoice | null;
    result: "player1" | "player2" | "tie";
    roundWinner: "player1" | "player2" | "tie";
    roundWinnerName: string | null;
    playerScore: number;
    opponentScore: number;
    roundNumber: number;
    isFinished: boolean;
  }) => void;
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
  camera_ready: (data: { roomId: string }) => void;
  player_action: (data: {
    roomId: string;
    action: "rematch" | "retire";
  }) => void;
}
