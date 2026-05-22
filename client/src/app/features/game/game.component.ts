import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '../../services/game.service';
import { GestureDetectorComponent } from './game-components/gesture-detector/gesture-detector.component';
import { CommonModule } from '@angular/common';
import { Choice } from '../../models/game-state.model';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { WebrtcService } from '../../services/webrtc.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, GestureDetectorComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  private router = inject(Router);
  private gameService = inject(GameService);
  private webrtcService = inject(WebrtcService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('remoteVideo') remoteVideoRef!: ElementRef<HTMLVideoElement>;

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

  betResolved = false;
  betResultMessage = '';
  myBetAmount = 0;
  opponentBetAmount = 0;
  totalBetPot = 0;

  private stateSub?: Subscription;
  private betResolvedSub?: Subscription;
  private webrtcSubs: Subscription[] = [];
  private rematchSubs: Subscription[] = [];

  wantsRematch = false;
  opponentWantsRematch = false;

  showOpponentVideo = false;
  winnerNameThisRound: string | null = null;
  isWinnerHighlightVisible = false;

  myAvatar = 'characters/karen.png';
  opponentAvatar = 'characters/java.png';

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
        }),
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
        this.matchWinnerName = state.matchWinnerName || 'Draw';
        this.playerRole = state.playerRole ?? null;

        this.isRoundActive = state.isRoundActive;
        this.isWaitingForReady = state.isWaitingForReady || false;

        this.roundResultText = this.getRoundResultText(state);

        this.myAvatar = (state as any).playerAvatar || 'characters/karen.png';
        this.opponentAvatar = (state as any).opponentAvatar || 'characters/java.png';

        if (state.isRoundActive) {
          this.showOpponentVideo = false;
          this.isWinnerHighlightVisible = false;
        } else if (state.lastRoundResult) {
          this.showOpponentVideo = true;
          this.winnerNameThisRound = state.lastRoundWinnerName || null;
          this.isWinnerHighlightVisible = true;
        }

        this.cdr.markForCheck();
      });

    this.betResolvedSub = this.gameService.onBetResolved().subscribe((data) => {
      if (!data) return;

      const isPlayerTwo = this.playerRole === 'player2';
      this.totalBetPot = Number(data.amount ?? 0);

      if (isPlayerTwo) {
        this.myBetAmount = Number(data.player2Bet ?? 0);
        this.opponentBetAmount = Number(data.player1Bet ?? 0);
      } else {
        this.myBetAmount = Number(data.player1Bet ?? 0);
        this.opponentBetAmount = Number(data.player2Bet ?? 0);
      }

      if (data.winner === 'Draw' || data.winner === 'tie') {
        this.betResultMessage = `Draw - Bets returned (${this.myBetAmount} shines)`;
      } else if (data.winner === this.playerName) {
        this.betResultMessage = `You won ${this.totalBetPot} shines (total pot)`;
      } else {
        this.betResultMessage = `You lost your bet of ${this.myBetAmount} shines`;
      }
      this.betResolved = true;
      this.cdr.markForCheck();
    });

    this.rematchSubs.push(
      this.gameService.onRematchOpponentStatus().subscribe((wants) => {
        this.opponentWantsRematch = wants;
        this.cdr.markForCheck();
      }),
    );

    this.rematchSubs.push(
      this.gameService.onRematchStart().subscribe((roomId) => {
        this.gameService.resetGame();
        this.router.navigate(['/waiting-room']);
      }),
    );

    this.rematchSubs.push(
      this.gameService.onRematchDeclined().subscribe(() => {
        this.opponentWantsRematch = false;
        this.cdr.markForCheck();
      }),
    );

    this.cdr.markForCheck();
  }

  async ngAfterViewInit(): Promise<void> {
    const roomId = this.gameService.getCurrentRoomId();
    if (!roomId) return;

    await this.webrtcService.init(roomId);

    this.webrtcSubs.push(
      this.webrtcService.remoteStream$.subscribe((stream) => {
        if (this.remoteVideoRef?.nativeElement) {
          this.remoteVideoRef.nativeElement.srcObject = stream;
        }
      }),
    );

    // Player1 initiates the offer after a short delay to ensure both sides are listening
    if (this.playerRole === 'player1') {
      setTimeout(() => this.webrtcService.makeOffer(), 1000);
    }
  }

  private getRoundResultText(state: any): string {
    if (!state.lastRoundResult) return '';

    if (state.lastRoundResult === 'tie') {
      return 'Round tied';
    }

    const winnerName = state.lastRoundWinnerName || 'Player';
    return `Round winner: ${winnerName}`;
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

  onRequestRematch() {
    if (!this.roomCode) return;
    this.wantsRematch = true;
    this.gameService.sendRematchRequest(this.roomCode);
  }

  onBackToMenu() {
    if (this.roomCode && this.isMatchFinished) {
      this.gameService.sendRematchDecline(this.roomCode);
    }
    this.gameService.resetGame();
    this.router.navigate(['/room-menu']);
  }

  sendCameraReady() {
    this.gameService.sendCameraReady(this.roomCode);
  }

  ngOnDestroy() {
    this.stateSub?.unsubscribe();
    this.betResolvedSub?.unsubscribe();
    this.webrtcSubs.forEach((s) => s.unsubscribe());
    this.rematchSubs.forEach((s) => s.unsubscribe());
    this.webrtcService.cleanup();
  }
}