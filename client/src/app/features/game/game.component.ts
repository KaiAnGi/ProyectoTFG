import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;

  // Info partida
  roomCode = 'KDS865';
  roomName = 'Son\'s of MELOLA';
  currentRound = 1;
  totalRounds = 5;

  // Gestos
  myGesture = '';
  opponentGesture = 'Paper!';

  // Vidas (true = rojo, false = blanco/perdida)
  myLives = [true, true, true];
  opponentLives = [true, true, true];

  // Camara
  private stream: MediaStream | null = null;

  constructor(private router: Router) {}

  async ngOnInit() {
    await this.startCamera();
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
      setTimeout(() => {
        if (this.localVideo?.nativeElement) {
          this.localVideo.nativeElement.srcObject = this.stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accediendo a camara:', error);
    }
  }

  // Pierde vida → ultimo corazon rojo se pone blanco
  loseMyLife() {
    const index = this.myLives.lastIndexOf(true);
    if (index !== -1) {
      this.myLives[index] = false;
    }
  }

  loseOpponentLife() {
    const index = this.opponentLives.lastIndexOf(true);
    if (index !== -1) {
      this.opponentLives[index] = false;
    }
  }

  onNextRound() {
    if (this.currentRound < this.totalRounds) {
      this.currentRound++;
      this.myGesture = '';
      this.loseMyLife(); // ← TEMPORAL para probar, Kai lo conecta al resultado real
    }
  }

  onExit() {
    this.stopCamera();
    this.router.navigate(['/room-menu']);
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }
}
