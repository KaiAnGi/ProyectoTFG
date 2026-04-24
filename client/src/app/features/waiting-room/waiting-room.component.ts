import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { Subscription } from 'rxjs';
import { GestureDetectorComponent } from '../game/game-components/gesture-detector/gesture-detector.component';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule, GestureDetectorComponent],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.css'],
})
export class WaitingRoomComponent implements OnDestroy {
  private stateSub?: Subscription;

  roomCode = '';
  roomName = '';
  copyFeedback = false;
  private copyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  player1 = {
    name: 'You',
    isReady: false, // Cambiado a false por defecto
    isYou: true,
  };

  player2 = {
    name: 'Opponent',
    isReady: false,
    isYou: false,
  };

  constructor(
    private router: Router,
    private gameService: GameService,
  ) {
    this.stateSub = this.gameService.gameState$.subscribe((state) => {
      this.roomCode = state.roomId || '';
      this.roomName = state.roomName || '';
      this.player1.name = state.playerName || 'You';
      this.player2.name = state.opponentName || 'Waiting...';
      this.player1.isReady = state.myCameraReady ?? false;
      this.player2.isReady = state.opponentCameraReady ?? false;

      if (state.isRoundActive && state.roomId) {
        this.router.navigate(['/game']);
      }
    });
  }

  // Toggle del estado ready del jugador 1
  toggleReady(): void {
    this.player1.isReady = !this.player1.isReady;
    console.log('Player 1 ready status:', this.player1.isReady);

    if (!this.roomCode) {
      return;
    }

    if (this.player1.isReady) {
      this.gameService.sendCameraReady(this.roomCode);
    } else {
      this.gameService.sendCameraNotReady(this.roomCode);
    }
  }

  canStartGame(): boolean {
    return this.player1.isReady && this.player2.isReady;
  }

  startGame(): void {
    if (this.canStartGame() && this.roomCode) {
      this.gameService.requestStartGame(this.roomCode);
    }
  }

  leaveRoom(): void {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  copyRoomCode(): void {
    if (!this.roomCode) {
      return;
    }

    navigator.clipboard
      .writeText(this.roomCode)
      .then(() => {
        this.copyFeedback = true;
        if (this.copyTimeoutId) {
          clearTimeout(this.copyTimeoutId);
        }
        this.copyTimeoutId = setTimeout(() => {
          this.copyFeedback = false;
          this.copyTimeoutId = null;
        }, 1500);
      })
      .catch((err) => {
        console.error('Error copiando room code:', err);
      });
  }

  goBack(): void {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
  }
}
