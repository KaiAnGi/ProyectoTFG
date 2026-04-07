import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { GestureDetectorComponent } from './game-components/gesture-detector/gesture-detector.component';
import { CommonModule } from '@angular/common';
import { Choice } from '../../models/game-state.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, GestureDetectorComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private gameService = inject(GameService);

  roomCode = 'KDS865';
  roomName = '';
  currentRound = 1;
  totalRounds = 3;

  myGesture: Choice | null = null;
  opponentGesture = '';

  myLives = [true, true, true];
  opponentLives = [true, true, true];
  private stateSub?: Subscription;

  ngOnInit() {
    this.stateSub = this.gameService.gameState$.subscribe((state) => {
      this.roomCode = state.roomId || '----';
      this.roomName = state.opponentName ? `${state.playerName} vs ${state.opponentName}` : state.playerName;
      this.currentRound = state.roundNumber;
      this.totalRounds = state.maxRounds;
      this.myGesture = state.playerChoice;
      this.opponentGesture = this.getGestureText(state.opponentChoice);
      this.myLives = Array.from({ length: 3 }, (_, i) => i < state.playerLives);
      this.opponentLives = Array.from({ length: 3 }, (_, i) => i < state.opponentLives);
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
    this.myGesture = null;
  }

  getGestureText(choice: Choice | null): string {
    switch (choice) {
      case 'rock':
        return 'Rock!';
      case 'paper':
        return 'Paper!';
      case 'scissors':
        return 'Scissors!';
      default:
        return '';
    }
  }

  onExit() {
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
  }
}
