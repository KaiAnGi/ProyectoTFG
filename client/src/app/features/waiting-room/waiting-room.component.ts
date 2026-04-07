import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.css']
})
export class WaitingRoomComponent implements OnDestroy {
  private stateSub?: Subscription;

  roomCode = '';
  roomName = '';
  
  player1 = {
    name: 'You',
    isReady: false,  // Cambiado a false por defecto
    isYou: true
  };
  
  player2 = {
    name: 'Opponent',
    isReady: false,
    isYou: false
  };

  constructor(private router: Router, private gameService: GameService) {
    this.stateSub = this.gameService.gameState$.subscribe((state) => {
      this.roomCode = state.roomId || '';
      this.roomName = state.roomId || '';
      this.player1.name = state.playerName || 'You';
      this.player2.name = state.opponentName || 'Waiting...';
      this.player2.isReady = !!state.opponentName;

      if (state.isRoundActive && state.roomId) {
        this.router.navigate(['/game']);
      }
    });
  }

  // Toggle del estado ready del jugador 1
  toggleReady(): void {
    this.player1.isReady = !this.player1.isReady;
    console.log('Player 1 ready status:', this.player1.isReady);
    // TODO: Emitir evento por socket
  }

  canStartGame(): boolean {
    return this.player2.isReady;
  }

  startGame(): void {
    if (this.canStartGame()) {
      this.router.navigate(['/game']);
    }
  }

  leaveRoom(): void {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  goBack(): void {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
  }
}
