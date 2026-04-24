import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SocketService } from './socket.service';
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

  private gameStateSubject = new BehaviorSubject<GameState>({ ...INITIAL_GAME_STATE });
  private listenersInitialized = false;

  public gameState$ = this.gameStateSubject.asObservable();

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
      console.log('PARTIDA FINALIZADA:', data);
      this.updateGameState({
        isMatchFinished: true,
        matchWinnerName: data.winner || null,
        isRoundActive: false,
      });
    });

    this.socketService.on('error').subscribe((data: any) => {
      console.error('Error de socket:', data?.message || data);
    });
  }

  /** Crear sala */
  createRoom(username: string, maxRounds: 3 | 5 | 9 = 3): void {
    this.socketService.connect();
    this.updateGameState({
      playerName: username,
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

  /** Unirse a sala */
  joinRoom(roomId: string, username: string): void {
    this.socketService.connect();
    this.updateGameState({
      playerName: username,
      isWaitingOpponent: true,
      isMatchFinished: false,
      matchWinnerName: null,
      history: [],
      playerScore: 0,
      opponentScore: 0,
    });
    this.socketService.emit('join_room', { roomId, username });
  }

  /** Elegir gesto */
  makeChoice(choice: Choice): void {
    // SIEMPRE actualizar estado local para mostrar el gesto detectado
    this.updateGameState({ playerChoice: choice });

    // Solo emitir al servidor si hay habitación y ronda activa
    const roomId = this.gameStateSubject.value.roomId;
    if (roomId && this.gameStateSubject.value.isRoundActive) {
      this.socketService.emit('player_choice', { roomId, choice }); // EMIT A DIEGUITO
    }
  }

  /** Limpiar la elección del jugador */
  clearPlayerChoice(): void {
    this.updateGameState({ playerChoice: null });
  }

  /** Actualizar estado de forma inmutable */
  private updateGameState(partial: PartialGameState): void {
    const currentState = this.gameStateSubject.value;
    this.gameStateSubject.next({ ...currentState, ...partial });
  }

  /** Resetear juego */
  resetGame(): void {
    this.gameStateSubject.next({ ...INITIAL_GAME_STATE });
    this.socketService.disconnect();
  }

  /** Getters públicos */
  get currentState(): GameState {
    return this.gameStateSubject.value;
  }

  getCurrentRoomId(): string | null {
    return this.gameStateSubject.value.roomId;
  }

  sendCameraReady(roomId: string): void {
    this.socketService.emit('camera_ready', { roomId });
  }
}
