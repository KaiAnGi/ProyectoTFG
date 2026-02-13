// import { Injectable, inject } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';
// import { SocketService } from './socket.service';
// import { GameState, Choice, RoundResult } from '../models/game-state.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class GameService {
//   private socketService = inject(SocketService);
//   private gameStateSubject = new BehaviorSubject<GameState>({
//     roomId: null,
//     playerName: '',
//     opponentName: '',
//     roundNumber: 1,
//     maxRounds: 10,
//     playerChoice: null,
//     opponentChoice: null,
//     playerScore: 0,
//     opponentScore: 0,
//     isWaitingOpponent: false,
//     isRoundActive: false,
//     history: []
//   });

//   public gameState$ = this.gameStateSubject.asObservable();

//   constructor() {
//     this.initSocketListeners();
//   }

//   private initSocketListeners(): void {
//     this.socketService.on('room_created').subscribe((data: any) => {
//       this.updateGameState({
//         roomId: data.roomId,
//         isWaitingOpponent: true
//       });
//     });

//     this.socketService.on('room_joined').subscribe((data: any) => {
//       this.updateGameState({
//         roomId: data.roomId,
//         opponentName: data.players[1],
//         isWaitingOpponent: false
//       });
//     });

//     this.socketService.on('start_round').subscribe((data: any) => {
//       this.updateGameState({
//         roundNumber: data.roundNumber,
//         playerChoice: null,
//         opponentChoice: null,
//         isRoundActive: true
//       });
//     });

//     this.socketService.on('round_result').subscribe((data: RoundResult) => {
//       const currentState = this.gameStateSubject.value;
//       this.updateGameState({
//         opponentChoice: data.opponentChoice,
//         playerScore: data.playerScore,
//         opponentScore: data.opponentScore,
//         roundNumber: data.roundNumber,
//         isRoundActive: false,
//         history: [...currentState.history, {
//           round: currentState.roundNumber,
//           playerChoice: data.playerChoice,
//           opponentChoice: data.opponentChoice,
//           result: data.result
//         }]
//       });
//     });

//     this.socketService.on('match_finished').subscribe((data: any) => {
//       console.log('PARTIDA FINALIZADA:', data);
//     });
//   }

//   createRoom(username: string): void {
//     this.socketService.connect();
//     this.updateGameState({ playerName: username });
//     this.socketService.emit('create_room', { username });
//   }

//   joinRoom(roomId: string, username: string): void {
//     this.socketService.connect();
//     this.updateGameState({ playerName: username });
//     this.socketService.emit('join_room', { roomId, username });
//   }

//   makeChoice(choice: Choice): void {
//     const roomId = this.gameStateSubject.value.roomId;
//     if (!roomId) return;

//     this.updateGameState({
//       playerChoice: choice,
//       isRoundActive: false
//     });
//     this.socketService.emit('player_choice', { roomId, choice });
//   }

//   private updateGameState(partial: Partial<GameState>): void {
//     const currentState = this.gameStateSubject.value;
//     this.gameStateSubject.next({ ...currentState, ...partial });
//   }

//   resetGame(): void {
//     this.gameStateSubject.next({
//       roomId: null,
//       playerName: '',
//       opponentName: '',
//       roundNumber: 1,
//       maxRounds: 10,
//       playerChoice: null,
//       opponentChoice: null,
//       playerScore: 0,
//       opponentScore: 0,
//       isWaitingOpponent: false,
//       isRoundActive: false,
//       history: []
//     });
//     this.socketService.disconnect();
//   }
// }

/* COMENTADO TEMPORALMENTE POR KAREN - ERRORES DE TIPOS

// ... pega aquí TODO el contenido actual

FIN DEL COMENTARIO */

// Servicio temporal vacío
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  constructor() { }
}
