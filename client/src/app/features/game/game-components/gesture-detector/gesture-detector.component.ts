import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject,
  effect,
  signal,
  OnDestroy,
} from '@angular/core';
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
export class GestureDetectorComponent implements AfterViewInit, OnDestroy {
  private mediaPipeService = inject(MediaPipeService);
  private gameService = inject(GameService);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  currentGesture = signal<GestureType>(null);
  confidence = signal<number>(0);
  isCameraReady = signal<boolean>(false);
  error = signal<string>('');

  constructor() {
    this.mediaPipeService.currentGesture$.subscribe((g) => this.currentGesture.set(g));
    this.mediaPipeService.confidence$.subscribe((c) => this.confidence.set(c));
    this.mediaPipeService.isCameraReady$.subscribe((r) => this.isCameraReady.set(r));
    this.mediaPipeService.error$.subscribe((e) => this.error.set(e || ''));

    effect(() => {
      const gesture = this.currentGesture();

      if (gesture) {
        console.log('🎮 Gesto detectado:', gesture);

        this.gameService['updateGameState']({
          playerChoice: gesture as Choice,
        });
      }
    });
  }

  async ngAfterViewInit() {
    await this.mediaPipeService.initCamera(
      this.videoElement.nativeElement,
      this.canvasElement.nativeElement,
    );
  }

  ngOnDestroy() {
    this.mediaPipeService.stopCamera();
  }
}
