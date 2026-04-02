import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { GestureDetectorComponent } from './game-components/gesture-detector/gesture-detector.component';
import { CommonModule } from '@angular/common';
import { Choice } from '../../models/game-state.model';

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
  roomName = "Son's of MELOLA";
  currentRound = 1;
  totalRounds = 5;

  myGesture: Choice | null = null;
  opponentGesture = 'Paper!';

  myLives = [true, true, true];
  opponentLives = [true, true, true];

  ngOnInit() {
    this.gameService.gameState$.subscribe((state) => {
      this.myGesture = state.playerChoice;
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
    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.myGesture = null;
    }
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
    this.router.navigate(['/room-menu']);
  }

  ngOnDestroy() {}
}
