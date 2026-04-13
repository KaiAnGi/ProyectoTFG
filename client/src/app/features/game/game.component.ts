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

  roomCode = 'KDS865';
  roomName = '';
  currentRound = 1;
  totalRounds = 3;

  myGesture: Choice | null = null;
  opponentGesture: Choice | null = null;

  myLives = [true, true, true];
  opponentLives = [true, true, true];
  private stateSub?: Subscription;

  ngOnInit() {
    this.stateSub = this.gameService.gameState$
      .pipe(
        distinctUntilChanged((prev, curr) => {
          // Solo actualizar si cambian valores relevantes
          return (
            prev.playerChoice === curr.playerChoice &&
            prev.opponentChoice === curr.opponentChoice &&
            prev.roundNumber === curr.roundNumber &&
            prev.playerLives === curr.playerLives &&
            prev.opponentLives === curr.opponentLives
          );
        }),
      )
      .subscribe((state) => {
        this.roomCode = state.roomId || '----';
        this.roomName = state.opponentName
          ? `${state.playerName} vs ${state.opponentName}`
          : state.playerName;
        this.currentRound = state.roundNumber;
        this.totalRounds = state.maxRounds;
        this.myGesture = state.playerChoice;
        this.opponentGesture = state.opponentChoice;
        this.myLives = Array.from({ length: 3 }, (_, i) => i < state.playerLives);
        this.opponentLives = Array.from({ length: 3 }, (_, i) => i < state.opponentLives);
        this.cdr.markForCheck();
      });
  }

  loseMyLife() {
    const index = this.myLives.lastIndexOf(true);
    if (index !== -1) this.myLives[index] = false;
  }

  loseOpponentLife() {
    const index = this.opponentLives.lastIndexOf(true);
    if (index !== -1) this.opponentLives[index] = false;
  }

  onNextRound() {
    this.gameService.clearPlayerChoice();
  }

  getGestureText(choice: Choice | null): string {
    switch (choice) {
      case 'rock':
        return 'Rock';
      case 'paper':
        return 'Paper';
      case 'scissors':
        return 'Scissors';
      default:
        return '';
    }
  }

  selectedGestureText(choice: Choice | null): string {
    if (choice) {
      return this.getGestureText(choice);
    }
    return 'Rock, Paper or Scissors';
  }

  onExit() {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
  }
}
