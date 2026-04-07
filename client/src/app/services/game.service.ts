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
        playerRole: 'player1',
        maxRounds: data.maxRounds || 3,
        isWaitingOpponent: true,
      });
    });

    this.socketService.on('room_joined').subscribe((data: any) => {
      const currentState = this.gameStateSubject.value;
      const players = Array.isArray(data.players) ? data.players : [];
      const currentPlayerName = currentState.playerName;
      const isPlayerOne = players[0] === currentPlayerName;

      this.updateGameState({
        roomId: data.roomId,
        playerRole: isPlayerOne ? 'player1' : 'player2',
        opponentName: isPlayerOne ? players[1] : players[0],
        maxRounds: data.maxRounds || 3,
        isWaitingOpponent: false,
      });
    });

    this.socketService.on('start_round').subscribe((data: any) => {
      this.updateGameState({
        roundNumber: data.roundNumber,
        playerChoice: null,
        opponentChoice: null,
        playerLives: 3,
        opponentLives: 3,
        isRoundActive: true,
      });
    });

    this.socketService.on('round_result').subscribe((data: any) => {
      const currentState = this.gameStateSubject.value;
      const isPlayerTwo = currentState.playerRole === 'player2';

      const playerChoice = (isPlayerTwo ? data.opponentChoice : data.playerChoice) as Choice;
      const opponentChoice = (isPlayerTwo ? data.playerChoice : data.opponentChoice) as Choice;
      const playerScore = isPlayerTwo ? data.opponentScore : data.playerScore;
      const opponentScore = isPlayerTwo ? data.playerScore : data.opponentScore;
      const playerLives = isPlayerTwo ? data.player2Lives : data.player1Lives;
      const opponentLives = isPlayerTwo ? data.player1Lives : data.player2Lives;

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
        playerLives: playerLives ?? 3,
        opponentLives: opponentLives ?? 3,
        roundNumber: data.roundNumber || 1,
        isRoundActive: !data.isFinished,
        history: [
          ...currentState.history,
          {
            round: currentState.roundNumber,
            playerChoice,
            opponentChoice,
            result,
          },
        ],
      });
    });

    this.socketService.on('match_finished').subscribe((data: any) => {
      console.log('PARTIDA FINALIZADA:', data);
      this.updateGameState({
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
    this.updateGameState({ playerName: username, isWaitingOpponent: true, maxRounds });
    this.socketService.emit('create_room', { username, maxRounds });
  }

  /** Unirse a sala */
  joinRoom(roomId: string, username: string): void {
    this.socketService.connect();
    this.updateGameState({ playerName: username, isWaitingOpponent: true });
    this.socketService.emit('join_room', { roomId, username });
  }

  /** Elegir gesto */
  makeChoice(choice: Choice): void {
    const roomId = this.gameStateSubject.value.roomId;
    if (
      !roomId
      || !this.gameStateSubject.value.isRoundActive
    )
      return;

    this.updateGameState({ playerChoice: choice });
    this.socketService.emit('player_choice', { roomId, choice }); // EMIT A DIEGUITO
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
}
