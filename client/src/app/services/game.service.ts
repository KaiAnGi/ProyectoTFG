import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocketService } from './socket.service';
import { GameState, Choice, RoundResult, PartialGameState } from '../models/game-state.model';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private socketService = inject(SocketService);

  private gameStateSubject = new BehaviorSubject<GameState>({
    roomId: null,
    playerName: '',
    opponentName: '',
    roundNumber: 1,
    maxRounds: 10,
    playerChoice: null,
    opponentChoice: null,
    playerScore: 0,
    opponentScore: 0,
    isWaitingOpponent: false,
    isRoundActive: false,
    history: [],
  });

  public gameState$ = this.gameStateSubject.asObservable();

  initListeners = (() => {
    this.socketService.on('room_created').subscribe((data: any) => {
      this.updateGameState({
        roomId: data.roomId,
        isWaitingOpponent: true,
      });
    });

    this.socketService.on('room_joined').subscribe((data: any) => {
      this.updateGameState({
        roomId: data.roomId,
        opponentName: data.players[1],
        isWaitingOpponent: false,
      });
    });

    this.socketService.on('start_round').subscribe((data: any) => {
      this.updateGameState({
        roundNumber: data.roundNumber,
        playerChoice: null,
        opponentChoice: null,
        isRoundActive: true,
      });
    });

    this.socketService.on('round_result').subscribe((data: any) => {
      const currentState = this.gameStateSubject.value;
      this.updateGameState({
        opponentChoice: data.opponentChoice || null,
        playerScore: data.playerScore || 0,
        opponentScore: data.opponentScore || 0,
        roundNumber: data.roundNumber || 1,
        isRoundActive: false,
        history: [
          ...currentState.history,
          {
            round: currentState.roundNumber,
            playerChoice: (data.playerChoice as Choice) || 'rock',
            opponentChoice: (data.opponentChoice as Choice) || 'rock',
            result: (data.result as RoundResult) || 'tie',
          },
        ],
      });
    });

    this.socketService.on('match_finished').subscribe((data: any) => {
      console.log('PARTIDA FINALIZADA:', data);
    });
  })();

  /** Crear sala */
  createRoom(username: string): void {
    this.socketService.connect();
    this.updateGameState({ playerName: username });
    this.socketService.emit('create_room', { username });
  }

  /** Unirse a sala */
  joinRoom(roomId: string, username: string): void {
    this.socketService.connect();
    this.updateGameState({ playerName: username });
    this.socketService.emit('join_room', { roomId, username });
  }

  /** Elegir gesto */
  makeChoice(choice: Choice): void {
    const roomId = this.gameStateSubject.value.roomId;
    if (
      !roomId
      //|| !this.gameStateSubject.value.isRoundActive //DEBUGGING TEMPORAL
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
    this.gameStateSubject.next({
      roomId: null,
      playerName: '',
      opponentName: '',
      roundNumber: 1,
      maxRounds: 10,
      playerChoice: null,
      opponentChoice: null,
      playerScore: 0,
      opponentScore: 0,
      isWaitingOpponent: false,
      isRoundActive: false,
      history: [],
    });
    this.socketService.disconnect();
  }

  /** Getters públicos */
  get currentState(): GameState {
    return this.gameStateSubject.value;
  }
}
