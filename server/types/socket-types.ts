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
  camera_ready_status: (data: {
    player1CameraReady: boolean;
    player2CameraReady: boolean;
    bothReady: boolean;
  }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { username: string; maxRounds?: 3 | 5 | 9 }) => void;
  join_room: (data: { roomId: string; username: string }) => void;
  player_choice: (data: { roomId: string; choice: GameChoice }) => void;
  camera_ready: (data: { roomId: string }) => void;
  camera_not_ready: (data: { roomId: string }) => void;
  start_game: (data: { roomId: string }) => void;
  player_action: (data: {
    roomId: string;
    action: "rematch" | "retire";
  }) => void;

  // Eventos de amigos y chat
  friend_request_sent: (data: { toUsername: string; message: string }) => void;
  friend_request_received: (data: {
    fromUsername: string;
    requestId: string;
  }) => void;
  friend_request_accepted: (data: { friendUsername: string }) => void;
  friend_request_rejected: (data: { fromUsername: string }) => void;
  friend_removed: (data: { friendUsername: string }) => void;
  chat_message: (data: {
    from: string;
    to: string;
    message: string;
    timestamp: Date;
  }) => void;
  chat_messages_read: (data: { friendUsername: string }) => void;
}

export interface ClientToServerEvents {
  create_room: (data: { username: string; maxRounds?: 3 | 5 | 9 }) => void;
  join_room: (data: { roomId: string; username: string }) => void;
  player_choice: (data: { roomId: string; choice: GameChoice }) => void;
  camera_ready: (data: { roomId: string }) => void;
  camera_not_ready: (data: { roomId: string }) => void;
  start_game: (data: { roomId: string }) => void;
  player_action: (data: {
    roomId: string;
    action: "rematch" | "retire";
  }) => void;

  // Eventos de amigos y chat
  send_friend_request: (data: { toUsername: string }) => void;
  accept_friend_request: (data: { requestId: string }) => void;
  reject_friend_request: (data: { requestId: string }) => void;
  remove_friend: (data: { friendUsername: string }) => void;
  send_chat_message: (data: { to: string; message: string }) => void;
  mark_chat_messages_read: (data: { friendUsername: string }) => void;
}
