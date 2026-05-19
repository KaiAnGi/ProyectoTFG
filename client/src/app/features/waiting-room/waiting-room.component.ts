import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

import { GameService } from '../../services/game.service';
import { AuthService, User } from '../../services/auth';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.css'],
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  private stateSub?: Subscription;
  private userSub?: Subscription;
  private betUpdatedSub?: Subscription;
  private betErrorSub?: Subscription;
  private betResolvedSub?: Subscription;

  private avatarSub?: Subscription;

  roomCode = '';
  roomName = '';
  copyFeedback = false;
  private copyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  characters: string[] = [
    'characters/java.png',
    'characters/copilot.png',
    'characters/kai.png',
    'characters/diego.png',
    'characters/karen.png',
  ];
  selectedCharacterIndex = 0;

  nextCharacter(): void {
    this.selectedCharacterIndex = (this.selectedCharacterIndex + 1) % this.characters.length;
    this.broadcastAvatar();
  }

  prevCharacter(): void {
    this.selectedCharacterIndex =
      (this.selectedCharacterIndex - 1 + this.characters.length) % this.characters.length;
    this.broadcastAvatar();
  }

  private broadcastAvatar(): void {
    if (this.roomCode) {
      this.gameService.sendAvatarSelection(this.roomCode, this.selectedCharacterIndex);
    }
  }

  player1 = { name: 'You', isReady: false, isYou: true };
  player2 = { name: 'Opponent', isReady: false, isYou: false, avatar: '' };

  myBones = 0;
  betInput = 1;
  betAmount = 0;
  player1BetConfirmed = false;
  player2BetConfirmed = false;
  player1BetAmount = 0;
  player2BetAmount = 0;
  myBetAmount = 0;
  opponentBetAmount = 0;
  betError = '';
  betResolved = false;
  betResultMessage = '';
  showBetResultModal = false;
  myUsername = '';

  constructor(
    private router: Router,
    private gameService: GameService,
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    const initialUser = this.authService.getCurrentUser();

    if (initialUser?.username) {
      this.applyUser(initialUser);
      this.loadBones();
    }

    this.userSub = this.authService.user$.subscribe((user) => {
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

      if (state.roomId && state.opponentName) {
        this.broadcastAvatar();
      }

      if (state.isRoundActive && state.roomId) {
        this.router.navigate(['/game']);
      }
    });

    this.betUpdatedSub = this.gameService.onBetUpdated().subscribe((data) => {
      if (!data) return;

      const currentState = this.gameService.currentState;
      const isPlayerTwo = currentState.playerRole === 'player2';

      this.betAmount = Number(data.betAmount ?? 0);
      this.player1BetAmount = Number(data.player1Bet ?? 0);
      this.player2BetAmount = Number(data.player2Bet ?? 0);

      if (isPlayerTwo) {
        this.player1BetConfirmed = !!data.player2Confirmed;
        this.player2BetConfirmed = !!data.player1Confirmed;
        this.myBetAmount = Number(data.player2Bet ?? 0);
        this.opponentBetAmount = Number(data.player1Bet ?? 0);
      } else {
        this.player1BetConfirmed = !!data.player1Confirmed;
        this.player2BetConfirmed = !!data.player2Confirmed;
        this.myBetAmount = Number(data.player1Bet ?? 0);
        this.opponentBetAmount = Number(data.player2Bet ?? 0);
      }

      this.betError = '';

      if (!this.player1BetConfirmed && this.myBetAmount === 0 && this.opponentBetAmount > 0) {
        this.betInput = this.opponentBetAmount;
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
      const totalPot = Number(data.amount ?? 0);

      if (data.winner === 'Empate' || data.winner === 'tie') {
        this.betResultMessage = `Empate - Se devolvieron las apuestas (${this.myBetAmount} shines)`;
      } else if (data.winner === this.myUsername) {
        this.betResultMessage = `Ganaste ${totalPot} shines (bote total)`;
      } else {
        this.betResultMessage = `Perdiste tu apuesta de ${this.myBetAmount} shines`;
      }

      this.showBetResultModal = true;
      this.loadBones();
      this.normalizeBetInput();
    });

    this.avatarSub = this.gameService.onAvatarSelected().subscribe((index) => {
      this.player2.avatar = this.characters[index] || '';
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

    this.http.get<{ bones: number }>(`/api/bones/${this.myUsername}`).subscribe({
      next: (res) => {
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
      return;
    }

    if (isNaN(this.betInput) || this.betInput < 0) {
      this.betInput = 0;
    }

    if (this.betInput > this.myBones) {
      this.betInput = this.myBones;
    }
  }

  canDecreaseBet(): boolean {
    return !this.player1BetConfirmed && this.betInput > 0;
  }

  canIncreaseBet(): boolean {
    return !this.player1BetConfirmed && this.betInput < this.myBones;
  }

  canConfirmBet(): boolean {
    return !this.player1BetConfirmed && this.betInput >= 0 && this.betInput <= this.myBones;
  }

  confirmBet(): void {
    if (!this.roomCode) return;

    if (this.betInput < 0) {
      this.betError = 'La apuesta mínima es 0';
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
    this.betInput = Math.max(0, this.betInput - 1);
    this.betError = '';
  }

  increaseBet(): void {
    if (!this.canIncreaseBet()) return;
    this.betInput = Math.min(this.myBones, this.betInput + 1);
    this.betError = '';
  }

  onBetInputChange(value: any): void {
    const parsed = Number(value);
    if (isNaN(parsed)) {
      this.betInput = 0;
    } else {
      this.betInput = Math.floor(parsed);
    }

    if (this.betInput < 0) this.betInput = 0;
    if (this.betInput > this.myBones) this.betInput = this.myBones;

    this.betError = '';
  }

  toggleReady(): void {
    this.player1.isReady = !this.player1.isReady;

    if (!this.roomCode) return;

    if (this.player1.isReady) {
      this.broadcastAvatar();
      this.gameService.sendCameraReady(this.roomCode);
    } else {
      this.gameService.sendCameraNotReady(this.roomCode);
    }
  }

  canStartGame(): boolean {
    return (
      this.player1.isReady &&
      this.player2.isReady &&
      this.player1BetConfirmed &&
      this.player2BetConfirmed
    );
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
    this.avatarSub?.unsubscribe();

    if (this.copyTimeoutId) {
      clearTimeout(this.copyTimeoutId);
    }
  }
}
