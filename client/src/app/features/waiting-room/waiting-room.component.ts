import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { GameService } from '../../services/game.service';
import { AuthService, User } from '../../services/auth';
import { GestureDetectorComponent } from '../game/game-components/gesture-detector/gesture-detector.component';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule, FormsModule, GestureDetectorComponent],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.css'],
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  private stateSub?: Subscription;
  private userSub?: Subscription;
  private betUpdatedSub?: Subscription;
  private betErrorSub?: Subscription;
  private betResolvedSub?: Subscription;

  roomCode = '';
  roomName = '';
  copyFeedback = false;
  private copyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  player1 = { name: 'You', isReady: false, isYou: true };
  player2 = { name: 'Opponent', isReady: false, isYou: false };

  myBones = 0;
  betInput = 1;
  betAmount = 0;
  player1BetConfirmed = false;
  player2BetConfirmed = false;
  betError = '';
  betResolved = false;
  betResultMessage = '';
  myUsername = '';

  constructor(
    private router: Router,
    private gameService: GameService,
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    const initialUser = this.authService.getCurrentUser();
    console.log('Usuario inicial:', initialUser);

    if (initialUser?.username) {
      this.applyUser(initialUser);
      this.loadBones();
    }

    this.userSub = this.authService.user$.subscribe((user) => {
      console.log('Usuario desde user$:', user);

      if (user?.username) {
        this.applyUser(user);
        this.loadBones();
      }
    });

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

    this.betUpdatedSub = this.gameService.onBetUpdated().subscribe((data) => {
      if (!data) return;

      this.betAmount = Number(data.betAmount ?? 0);
      this.player1BetConfirmed = !!data.player1Confirmed;
      this.player2BetConfirmed = !!data.player2Confirmed;
      this.betError = '';

      if (!this.player1BetConfirmed && this.betAmount > 0) {
        this.betInput = this.betAmount;
        this.normalizeBetInput();
      }
    });

    this.betErrorSub = this.gameService.onBetError().subscribe((data) => {
      if (!data) return;
      this.betError = data.message || 'Error al procesar la apuesta';
    });

    this.betResolvedSub = this.gameService.onBetResolved().subscribe((data) => {
      if (!data) return;

      this.betResolved = true;

      if (data.winner === 'Empate' || data.winner === 'tie') {
        this.betResultMessage = 'Tie - bones returned';
      } else if (data.winner === this.myUsername) {
        this.betResultMessage = `You won ${data.amount} bones`;
        this.myBones += Number(data.amount ?? 0);
      } else {
        this.betResultMessage = `You lost ${data.amount} bones`;
        this.myBones -= Number(data.amount ?? 0);
      }

      this.normalizeBetInput();
    });
  }

  private applyUser(user: User): void {
    this.myUsername = user.username;
    this.myBones = Number(user.bones ?? 0);
    this.normalizeBetInput();
  }

  private loadBones(): void {
    if (!this.myUsername) {
      this.betError = 'No se encontró el usuario autenticado';
      this.myBones = 0;
      this.betInput = 0;
      return;
    }

    console.log('Cargando shines para:', this.myUsername);

    this.http.get<{ bones: number }>(`/api/bones/${this.myUsername}`).subscribe({
      next: (res) => {
        console.log('Respuesta bones:', res);
        this.myBones = Number(res.bones ?? 0);
        this.normalizeBetInput();
        this.betError = '';
      },
      error: (err) => {
        console.error('Error en /api/bones:', err);
        this.myBones = Number(this.authService.getCurrentUser()?.bones ?? 0);
        this.normalizeBetInput();

        if (this.myBones > 0) {
          this.betError = '';
        } else {
          this.betError = 'No se pudieron cargar tus shines';
        }
      },
    });
  }

  private normalizeBetInput(): void {
    if (this.myBones <= 0) {
      this.betInput = 0;
    } else if (this.betInput <= 0) {
      this.betInput = 1;
    } else if (this.betInput > this.myBones) {
      this.betInput = this.myBones;
    }
  }

  canDecreaseBet(): boolean {
    return !this.player1BetConfirmed && this.myBones > 0 && this.betInput > 1;
  }

  canIncreaseBet(): boolean {
    return !this.player1BetConfirmed && this.myBones > 0 && this.betInput < this.myBones;
  }

  canConfirmBet(): boolean {
    return !this.player1BetConfirmed && this.myBones > 0 && this.betInput > 0 && this.betInput <= this.myBones;
  }

  confirmBet(): void {
    if (!this.roomCode) return;

    if (this.myBones <= 0) {
      this.betError = 'No tienes shines suficientes';
      return;
    }

    if (this.betInput < 1) {
      this.betError = 'La apuesta mínima es 1';
      return;
    }

    if (this.betInput > this.myBones) {
      this.betError = 'No tienes shines suficientes';
      return;
    }

    this.betError = '';
    this.gameService.setBet(this.roomCode, this.betInput);
  }

  decreaseBet(): void {
    if (!this.canDecreaseBet()) return;
    this.betInput--;
    this.betError = '';
  }

  increaseBet(): void {
    if (!this.canIncreaseBet()) return;
    this.betInput++;
    this.betError = '';
  }

  toggleReady(): void {
    this.player1.isReady = !this.player1.isReady;

    if (!this.roomCode) return;

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
    if (!this.roomCode) return;

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
      .catch((err) => console.error('Error copying room code:', err));
  }

  goBack(): void {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  ngOnDestroy(): void {
    this.stateSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.betUpdatedSub?.unsubscribe();
    this.betErrorSub?.unsubscribe();
    this.betResolvedSub?.unsubscribe();

    if (this.copyTimeoutId) {
      clearTimeout(this.copyTimeoutId);
    }
  }
}