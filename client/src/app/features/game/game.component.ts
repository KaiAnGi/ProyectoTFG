import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { GestureDetectorComponent } from './game-components/gesture-detector/gesture-detector.component';
import { CommonModule } from '@angular/common';
import { Choice } from '../../models/game-state.model';
import { Subscription, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, GestureDetectorComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private gameService = inject(GameService);
  private cdr = inject(ChangeDetectorRef);

  // Estado UI
  roomCode = '';
  roomName = '';
  playerName = '';
  opponentName = '';

  currentRound = 1;
  totalRounds = 3;
  timerSec = 0;

  myScore = 0;
  opponentScore = 0;

  roundResultText = '';

  isMatchFinished = false;
  matchWinnerName = '';
  playerRole: 'player1' | 'player2' | null = null;

  isRoundActive = false;
  isWaitingForReady = false;

  myGesture: Choice | null = null;
  opponentGesture: Choice | null = null;

  private stateSub?: Subscription;

  ngOnInit() {
    this.stateSub = this.gameService.gameState$
      .pipe(
        distinctUntilChanged((prev, curr) => {
          if (!prev || !curr) return false;

          return (
            prev.playerChoice === curr.playerChoice &&
            prev.opponentChoice === curr.opponentChoice &&
            prev.roundNumber === curr.roundNumber &&
            prev.playerScore === curr.playerScore &&
            prev.opponentScore === curr.opponentScore &&
            prev.roundTimeLeftSec === curr.roundTimeLeftSec &&
            prev.lastRoundResult === curr.lastRoundResult &&
            prev.lastRoundWinnerName === curr.lastRoundWinnerName &&
            prev.isMatchFinished === curr.isMatchFinished &&
            prev.matchWinnerName === curr.matchWinnerName &&
            prev.isRoundActive === curr.isRoundActive &&
            prev.isWaitingForReady === curr.isWaitingForReady
          );
        })
      )
      .subscribe((state) => {
        this.roomCode = state.roomId || '----';
        this.playerName = state.playerName || '';
        this.opponentName = state.opponentName || '';

        this.roomName = this.opponentName
          ? `${this.playerName} vs ${this.opponentName}`
          : this.playerName;
        this.currentRound = state.roundNumber;
        this.totalRounds = state.maxRounds;
        this.timerSec = state.roundTimeLeftSec;

        this.myGesture = state.playerChoice;
        this.opponentGesture = state.opponentChoice;

        this.myScore = state.playerScore;
        this.opponentScore = state.opponentScore;

        this.isMatchFinished = state.isMatchFinished;
        this.matchWinnerName = state.matchWinnerName || 'Empate';
        this.playerRole = state.playerRole ?? null;

        this.isRoundActive = state.isRoundActive;
        this.isWaitingForReady = state.isWaitingForReady || false;

        this.roundResultText = this.getRoundResultText(state);

        this.cdr.markForCheck();
      });
  }

  private getRoundResultText(state: any): string {
    if (!state.lastRoundResult) return '';

    if (state.lastRoundResult === 'tie') {
      return 'Ronda empatada';
    }

    const winnerName = state.lastRoundWinnerName || 'Jugador';
    return `Ganador de ronda: ${winnerName}`;
  }

  selectedGestureText(choice: Choice | null): string {
    switch (choice) {
      case 'rock':
        return 'Rock';
      case 'paper':
        return 'Paper';
      case 'scissors':
        return 'Scissors';
      default:
        return 'Rock, Paper or Scissors';
    }
  }

  onExit() {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  onBackToMenu() {
    this.onExit();
  }

  sendCameraReady() {
    this.gameService.sendCameraReady(this.roomCode);
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
  }
}
