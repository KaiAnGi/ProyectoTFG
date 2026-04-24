import {
  Component, OnInit, OnDestroy, inject,
  ChangeDetectionStrategy, ChangeDetectorRef,
  ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { WebRTCService } from '../../services/webrtc.service';
import { MediaPipeService } from '../../services/mediapipe.service';
import { GestureDetectorComponent } from './game-components/gesture-detector/gesture-detector.component';
import { CommonModule } from '@angular/common';
import { Choice } from '../../models/game-state.model';
import { Subscription, distinctUntilChanged, take, filter } from 'rxjs';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, GestureDetectorComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  private router = inject(Router);
  private gameService = inject(GameService);
  private webRTCService = inject(WebRTCService);
  private mediaPipeService = inject(MediaPipeService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

  roomCode = 'KDS865';
  roomName = '';
  playerName = '';
  currentRound = 1;
  totalRounds = 3;
  timerSec = 0;
  myScore = 0;
  opponentScore = 0;
  roundResultText = '';
  isMatchFinished = false;
  matchWinnerName = '';
  playerRole: 'player1' | 'player2' | null = null;

  myGesture: Choice | null = null;
  opponentGesture: Choice | null = null;
  private stateSub?: Subscription;

  ngOnInit() {
    this.stateSub = this.gameService.gameState$
      .pipe(
        distinctUntilChanged((prev, curr) => {
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
            prev.matchWinnerName === curr.matchWinnerName
          );
        }),
      )
      .subscribe((state) => {
        this.roomCode = state.roomId || '----';
        this.playerName = state.playerName;
        this.roomName = state.opponentName
          ? `${state.playerName} vs ${state.opponentName}`
          : state.playerName;
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

        if (state.lastRoundResult) {
          if (state.lastRoundResult === 'tie') {
            this.roundResultText = 'Ronda empatada';
          } else {
            const winnerName = state.lastRoundWinnerName || 'Jugador';
            this.roundResultText = `Ganador de ronda: ${winnerName}`;
          }
        } else {
          this.roundResultText = '';
        }

        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit() {
    this.gameService.gameState$.pipe(
      filter(state => !!state.roomId),
      take(1)
    ).subscribe(state => {
      this.mediaPipeService.isCameraReady$.pipe(
        filter(ready => ready),
        take(1)
      ).subscribe(() => {
        this.webRTCService.init(
          state.roomId!,
          this.remoteVideoRef.nativeElement,
          state.playerRole === 'player1'
        );
      });
    });
  }

  getGestureText(choice: Choice | null): string {
    switch (choice) {
      case 'rock': return 'Rock';
      case 'paper': return 'Paper';
      case 'scissors': return 'Scissors';
      default: return '';
    }
  }

  selectedGestureText(choice: Choice | null): string {
    return choice ? this.getGestureText(choice) : 'Rock, Paper or Scissors';
  }

  onExit() {
    this.webRTCService.stop();
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  onBackToMenu() {
    this.onExit();
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.webRTCService.stop();
  }
}