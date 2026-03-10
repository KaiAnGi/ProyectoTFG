import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocketService } from './socket.service';
import { GameState, Choice, RoundResult } from '../models/game-state.model';

@Injectable({
  providedIn: 'root'
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
    history: []
  });

  public gameState$ = this.gameStateSubject.asObservable();

  constructor() {
    this.initSocketListeners();
  }

  private initSocketListeners(): void {
    this.socketService.on('room_created').subscribe((data: any) => {
      this.updateGameState({
        roomId: data.roomId,
        maxRounds: data.maxRounds || 3,
        isWaitingOpponent: true
      });
    });

    this.socketService.on('room_joined').subscribe((data: any) => {
      this.updateGameState({
        roomId: data.roomId,
        opponentName: data.players[1],
        maxRounds: data.maxRounds || 3,
        isWaitingOpponent: false
      });
    });

    this.socketService.on('start_round').subscribe((data: any) => {
      this.updateGameState({
        roundNumber: data.roundNumber,
        playerChoice: null,
        opponentChoice: null,
        isRoundActive: true
      });
    });

    this.socketService.on('round_result').subscribe((data: any) => {
      const currentState = this.gameStateSubject.value;
      this.updateGameState({
        opponentChoice: data.opponentChoice,
        playerScore: data.playerScore,
        opponentScore: data.opponentScore,
        roundNumber: data.roundNumber,
        isRoundActive: false,
        isMatchFinished: data.isFinished || false,
        history: [...currentState.history, {
          round: currentState.roundNumber,
          playerChoice: data.playerChoice,
          opponentChoice: data.opponentChoice,
          result: data.result
        }]
      });
    });

    this.socketService.on('match_finished').subscribe((data: any) => {
      console.log('PARTIDA FINALIZADA:', data);
      this.updateGameState({
        isMatchFinished: true,
        systemMessage: `Partida terminada. Ganador: ${data.winner}`
      });
    });
  }

  createRoom(username: string, maxRounds: 3 | 5 | 9 = 3): void {
    this.socketService.connect();
    this.updateGameState({ playerName: username, maxRounds });
    this.socketService.emit('create_room', { username, maxRounds });
  }

  joinRoom(roomId: string, username: string): void {
    this.socketService.connect();
    this.updateGameState({ playerName: username });
    this.socketService.emit('join_room', { roomId, username });
  }

  makeChoice(choice: Choice): void {
    const roomId = this.gameStateSubject.value.roomId;
    if (!roomId) return;

    this.updateGameState({
      playerChoice: choice,
      isRoundActive: false
    });
    this.socketService.emit('player_choice', { roomId, choice });
  }

  private updateGameState(partial: Partial<GameState>): void {
    const currentState = this.gameStateSubject.value;
    this.gameStateSubject.next({ ...currentState, ...partial });
  }

  resetGame(): void {
    this.gameStateSubject.next({
      roomId: null,
      playerName: '',
      opponentName: null,
      roundNumber: 1,
      maxRounds: 3,
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
    });
    this.socketService.disconnect();
  }
}
