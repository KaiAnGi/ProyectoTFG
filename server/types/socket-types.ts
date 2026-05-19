
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

  // --- APUESTAS ---
  bet_updated: (data: {
    betAmount: number;
    player1Bet: number;
    player2Bet: number;
    player1Confirmed: boolean;
    player2Confirmed: boolean;
  }) => void;

  bet_resolved: (data: {
    winner: string;
    amount: number;
    player1Bet: number;
    player2Bet: number;
    player1Bones: number;
    player2Bones: number;
  }) => void;

  bet_error: (data: { message: string }) => void;

  error: (data: { message: string }) => void;

  // --- WEBRTC ---
  webrtc_offer: (data: WebrtcOfferData) => void;
  webrtc_answer: (data: WebrtcAnswerData) => void;
  webrtc_ice_candidate: (data: WebrtcIceCandidateData) => void;
}

export interface WebrtcOfferData {
  sdp: string;
  type: "offer";
  targetSocketId: string;
}

export interface WebrtcAnswerData {
  sdp: string;
  type: "answer";
  targetSocketId: string;
}

export interface WebrtcIceCandidateData {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  targetSocketId: string;
}

export interface ClientToServerEvents {
  // Sala
  create_room: (data: { username: string; maxRounds?: 3 | 5 | 9 }) => void;
  join_room: (data: { roomId: string; username: string }) => void;
  start_game: (data: { roomId: string }) => void;
  player_action: (data: { roomId: string; action: "rematch" | "retire" }) => void;

  // Juego
  player_choice: (data: { roomId: string; choice: GameChoice }) => void;
  camera_ready: (data: { roomId: string }) => void;
  camera_not_ready: (data: { roomId: string }) => void;

  // --- APUESTAS ---
  set_bet: (data: { roomId: string; amount: number }) => void;

  // Amigos
  send_friend_request: (data: { toUsername: string }) => void;
  accept_friend_request: (data: { requestId: string }) => void;
  reject_friend_request: (data: { requestId: string }) => void;
  remove_friend: (data: { friendUsername: string }) => void;

  // Chat
  send_chat_message: (data: { to: string; message: string }) => void;
  mark_chat_messages_read: (data: { friendUsername: string }) => void;

  // --- WEBRTC ---
  webrtc_offer: (data: { sdp: string; roomId: string }) => void;
  webrtc_answer: (data: { sdp: string; roomId: string }) => void;
  webrtc_ice_candidate: (data: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null; roomId: string }) => void;
}