import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { SocketService } from './socket.service';
import { AuthService } from './auth';
import {
  GameState,
  Choice,
  RoundResult,
  PartialGameState,
  INITIAL_GAME_STATE,
} from '../models/game-state.model';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private socketService = inject(SocketService);
  private authService = inject(AuthService);

  private gameStateSubject = new BehaviorSubject<GameState>({ ...INITIAL_GAME_STATE });
  private listenersInitialized = false;

  private betUpdatedSubject = new BehaviorSubject<{
    betAmount: number;
    player1Bet: number;
    player2Bet: number;
    player1Confirmed: boolean;
    player2Confirmed: boolean;
  } | null>(null);

  private betErrorSubject = new BehaviorSubject<{ message: string } | null>(null);

  private betResolvedSubject = new BehaviorSubject<{
    winner: string;
    amount: number;
    player1Bet: number;
    player2Bet: number;
    player1Bones: number;
    player2Bones: number;
  } | null>(null);

  private avatarSelectedSubject = new Subject<number>();

  public gameState$ = this.gameStateSubject.asObservable();

  // NUEVO: Observable para escuchar el cambio de avatar del oponente
  private opponentAvatarSubject = new BehaviorSubject<{ avatar: string } | null>(null);
  public opponentAvatar$ = this.opponentAvatarSubject.asObservable();

  private rematchOpponentStatusSubject = new Subject<boolean>();
  private rematchStartSubject = new Subject<string>();
  private rematchDeclinedSubject = new Subject<void>();

  constructor() {
    this.initListeners();
  }

  private initListeners() {
    if (this.listenersInitialized) return;
    this.listenersInitialized = true;

    this.socketService.on('room_created').subscribe((data: any) => {
      this.updateGameState({
        roomId: data.roomId,
        playerRole: data.playerRole || 'player1',
        playerName: data.playerName || this.gameStateSubject.value.playerName,
        opponentName: data.opponentName || null,
        maxRounds: data.maxRounds || 3,
        isWaitingOpponent: true,
        isWaitingForReady: true,
      });
    });

    this.socketService.on('room_joined').subscribe((data: any) => {
      this.updateGameState({
        roomId: data.roomId,
        playerRole: data.playerRole || null,
        playerName: data.playerName || this.gameStateSubject.value.playerName,
        opponentName: data.opponentName || null,
        maxRounds: data.maxRounds || 3,
        isWaitingOpponent: false,
        isWaitingForReady: true,
      });
    });

    this.socketService.on('camera_ready_status').subscribe((data: any) => {
      const currentState = this.gameStateSubject.value;
      const isPlayerTwo = currentState.playerRole === 'player2';

      const myCameraReady = isPlayerTwo ? data.player2CameraReady : data.player1CameraReady;
      const opponentCameraReady = isPlayerTwo ? data.player1CameraReady : data.player2CameraReady;

      this.updateGameState({
        myCameraReady,
        opponentCameraReady,
        isWaitingForReady: !data.bothReady,
      });
    });

    this.socketService.on('start_round').subscribe((data: any) => {
      this.updateGameState({
        roundNumber: data.roundNumber,
        playerChoice: null,
        opponentChoice: null,
        roundTimeLeftSec: data.timeLimitSec ?? 5,
        lastRoundResult: null,
        lastRoundWinnerName: null,
        isRoundActive: true,
        isWaitingForReady: false,
      });
    });

    this.socketService.on('round_timer').subscribe((data: any) => {
      this.updateGameState({
        roundTimeLeftSec: data.timeLeftSec ?? 0,
      });
    });

    this.socketService.on('round_result').subscribe((data: any) => {
      const currentState = this.gameStateSubject.value;
      const isPlayerTwo = currentState.playerRole === 'player2';

      const playerChoice = (isPlayerTwo ? data.opponentChoice : data.playerChoice) as Choice;
      const opponentChoice = (isPlayerTwo ? data.playerChoice : data.opponentChoice) as Choice;
      const playerScore = isPlayerTwo ? data.opponentScore : data.playerScore;
      const opponentScore = isPlayerTwo ? data.playerScore : data.opponentScore;

      let result: RoundResult = 'tie';
      if (data.result === 'tie') {
        result = 'tie';
      } else if (isPlayerTwo) {
        result = data.result === 'player2' ? 'win' : 'lose';
      } else {
        result = data.result === 'player1' ? 'win' : 'lose';
      }

      this.updateGameState({
        playerChoice,
        opponentChoice,
        playerScore: playerScore || 0,
        opponentScore: opponentScore || 0,
        lastRoundResult: result,
        lastRoundWinnerName: data.roundWinnerName || null,
        roundNumber: data.roundNumber || 1,
        roundTimeLeftSec: 0,
        isRoundActive: false,
        history: [
          ...currentState.history,
          {
            round: data.roundNumber || currentState.roundNumber,
            playerChoice,
            opponentChoice,
            result,
            winnerName: data.roundWinnerName || null,
          },
        ],
      });
    });

    this.socketService.on('match_finished').subscribe((data: any) => {
      this.updateGameState({
        isMatchFinished: true,
        matchWinnerName: data.winner || null,
        isRoundActive: false,
      });
    });

    this.socketService.on('bet_updated').subscribe((data: any) => {
      this.betUpdatedSubject.next({
        betAmount: Number(data?.betAmount ?? 0),
        player1Bet: Number(data?.player1Bet ?? 0),
        player2Bet: Number(data?.player2Bet ?? 0),
        player1Confirmed: !!data?.player1Confirmed,
        player2Confirmed: !!data?.player2Confirmed,
      });
    });

    this.socketService.on('bet_error').subscribe((data: any) => {
      this.betErrorSubject.next({
        message: data?.message || 'Error al procesar la apuesta',
      });
    });

    this.socketService.on('bet_resolved').subscribe((data: any) => {
      console.log('[GameService] bet_resolved recibido:', data);
      this.betResolvedSubject.next({
        winner: data?.winner || '',
        amount: Number(data?.amount ?? 0),
        player1Bet: Number(data?.player1Bet ?? 0),
        player2Bet: Number(data?.player2Bet ?? 0),
        player1Bones: Number(data?.player1Bones ?? 0),
        player2Bones: Number(data?.player2Bones ?? 0),
      });

      const user = this.authService.getCurrentUser();
      if (!user) return;
      const isPlayerTwo = this.gameStateSubject.value.playerRole === 'player2';
      const myBones = isPlayerTwo
        ? Number(data?.player2Bones ?? 0)
        : Number(data?.player1Bones ?? 0);
      if (myBones > 0) {
        this.authService.updateBones(myBones);
      }
    });

    this.socketService.on('avatar_selected').subscribe((data: any) => {
      this.avatarSelectedSubject.next(Number(data?.characterIndex ?? 0));
    });

    this.socketService.on('rematch_opponent_status').subscribe((data: any) => {
      this.rematchOpponentStatusSubject.next(!!data?.wantsRematch);
    });

    this.socketService.on('rematch_start').subscribe((data: any) => {
      this.rematchStartSubject.next(data?.roomId || '');
    });

    this.socketService.on('rematch_declined').subscribe(() => {
      this.rematchDeclinedSubject.next();
    });

    this.socketService.on('error').subscribe((data: any) => {
      console.error('Socket error:', data?.message || data);
    });

    // NUEVO: Escuchar cambios en el avatar del oponente
    this.socketService.on('opponent_avatar_updated').subscribe((data: any) => {
      this.opponentAvatarSubject.next({ avatar: data?.avatar });
    });
  }

  createRoom(username: string, roomName: string, maxRounds: 3 | 5 | 9 = 3): void {
    this.socketService.connect();
    this.updateGameState({
      playerName: username,
      roomName,
      isWaitingOpponent: true,
      maxRounds,
      isMatchFinished: false,
      matchWinnerName: null,
      history: [],
      playerScore: 0,
      opponentScore: 0,
    });
    this.socketService.emit('create_room', { username, maxRounds });
  }

  joinRoom(roomId: string, username: string, roomName: string): void {
    this.socketService.connect();
    this.updateGameState({
      playerName: username,
      roomName,
      isWaitingOpponent: true,
      isMatchFinished: false,
      matchWinnerName: null,
      history: [],
      playerScore: 0,
      opponentScore: 0,
    });
    this.socketService.emit('join_room', { roomId, username });
  }

  makeChoice(choice: Choice): void {
    this.updateGameState({ playerChoice: choice });
    const roomId = this.gameStateSubject.value.roomId;
    if (roomId && this.gameStateSubject.value.isRoundActive) {
      this.socketService.emit('player_choice', { roomId, choice });
    }
  }

  clearPlayerChoice(): void {
    this.updateGameState({ playerChoice: null });
  }

  private updateGameState(partial: PartialGameState): void {
    const currentState = this.gameStateSubject.value;
    this.gameStateSubject.next({ ...currentState, ...partial });
  }

  resetGame(): void {
    this.gameStateSubject.next({ ...INITIAL_GAME_STATE });
    this.betUpdatedSubject.next(null);
    this.betErrorSubject.next(null);
    this.betResolvedSubject.next(null);
    this.opponentAvatarSubject.next(null);
    this.socketService.disconnect();
  }

  get currentState(): GameState {
    return this.gameStateSubject.value;
  }

  getCurrentRoomId(): string | null {
    return this.gameStateSubject.value.roomId;
  }

  sendRematchRequest(roomId: string): void {
    this.socketService.emit('rematch_request', { roomId });
  }

  sendRematchDecline(roomId: string): void {
    this.socketService.emit('rematch_decline', { roomId });
  }

  onRematchOpponentStatus(): Observable<boolean> {
    return this.rematchOpponentStatusSubject.asObservable();
  }

  onRematchStart(): Observable<string> {
    return this.rematchStartSubject.asObservable();
  }

  onRematchDeclined(): Observable<void> {
    return this.rematchDeclinedSubject.asObservable();
  }

  sendAvatarSelection(roomId: string, characterIndex: number): void {
    this.socketService.emit('avatar_selected', { roomId, characterIndex });
  }

  sendCameraReady(roomId: string): void {
    this.socketService.emit('camera_ready', { roomId });
  }

  sendCameraNotReady(roomId: string): void {
    this.socketService.emit('camera_not_ready', { roomId });
  }

  requestStartGame(roomId: string): void {
    this.socketService.emit('start_game', { roomId });
  }

  setBet(roomId: string, amount: number): void {
    const safeAmount = Math.floor(Number(amount));

    if (!roomId || !Number.isFinite(safeAmount) || safeAmount < 0) {
      this.betErrorSubject.next({ message: 'Invalid amount' });
      return;
    }

    this.socketService.emit('set_bet', { roomId, amount: safeAmount });
  }

  // NUEVO: Emitir el cambio de avatar al backend
  updateAvatar(roomId: string, avatarUrl: string): void {
    if (!roomId || !avatarUrl) return;
    this.socketService.emit('update_avatar', { roomId, avatar: avatarUrl });
  }

  onBetUpdated(): Observable<{
    betAmount: number;
    player1Bet: number;
    player2Bet: number;
    player1Confirmed: boolean;
    player2Confirmed: boolean;
  } | null> {
    return this.betUpdatedSubject.asObservable();
  }

  onBetError(): Observable<{ message: string } | null> {
    return this.betErrorSubject.asObservable();
  }

  onBetResolved(): Observable<{
    winner: string;
    amount: number;
    player1Bet: number;
    player2Bet: number;
    player1Bones: number;
    player2Bones: number;
  } | null> {
    return this.betResolvedSubject.asObservable();
  }

  onAvatarSelected(): Observable<number> {
    return this.avatarSelectedSubject.asObservable();
  }
}