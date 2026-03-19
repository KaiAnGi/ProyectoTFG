import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaPipeService, GestureType } from '../../../../services/mediapipe.service';
import { GameService } from '../../../../services/game.service';
import { Choice } from '../../../../models/game-state.model';

@Component({
  selector: 'app-gesture-detector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gesture-detector.component.html',
  styleUrl: './gesture-detector.component.css',
})
export class GestureDetectorComponent implements AfterViewInit {
  private mediaPipeService = inject(MediaPipeService);
  private gameService = inject(GameService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  currentGesture = signal<GestureType>(null);
  confidence = signal<number>(0);
  isCameraReady = signal<boolean>(false);
  error = signal<string>('');

  constructor() {
    this.mediaPipeService.currentGesture$.subscribe(gesture =>
      this.currentGesture.set(gesture)
    );

    this.mediaPipeService.confidence$.subscribe(confidence =>
      this.confidence.set(confidence)
    );

    this.mediaPipeService.isCameraReady$.subscribe(ready =>
      this.isCameraReady.set(ready)
    );

    this.mediaPipeService.error$.subscribe(err =>
      this.error.set(err || '')
    );

    effect(() => {
      const gesture = this.currentGesture();
      const currentState = this.gameService.currentState;
      if (gesture && currentState && 'isRoundActive' in currentState && currentState.isRoundActive) {
        console.log('🎮 Gesto detectado:', gesture);
        this.gameService.makeChoice(gesture as Choice);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.mediaPipeService.initCamera(
        this.videoElement!.nativeElement,
        this.canvasElement!.nativeElement
      );
      console.log('Cámara iniciada correctamente');
    } catch (error: any) {
      console.error('Error cámara:', error);
      this.error.set(`Error cámara: ${error.message}`);
    }
  }

  getGestureName(gesture: GestureType): string {
  switch (gesture) {
    case 'rock': return 'Piedra';
    case 'paper': return 'Papel';
    case 'scissors': return 'Tijera';
    default: return 'Ninguno';
  }
}

  getGestureClass(gesture: GestureType): string {
    return gesture ? `gesture-${gesture}` : 'gesture-none';
  }

  getConfidenceColor(): string {
    const conf = this.confidence();
    if (conf > 0.8) return 'text-success';
    if (conf > 0.6) return 'text-warning';
    return 'text-danger';
  }
}
