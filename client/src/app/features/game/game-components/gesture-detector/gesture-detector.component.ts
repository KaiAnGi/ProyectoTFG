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
  styleUrls: ['./gesture-detector.component.css'],
})
export class GestureDetectorComponent implements AfterViewInit, OnDestroy {
  private mediaPipeService = inject(MediaPipeService);
  private gameService = inject(GameService);
  private lastSentChoice: Choice | null = null;

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

      if (gesture && gesture !== this.lastSentChoice) {
        this.lastSentChoice = gesture as Choice;
        this.gameService.makeChoice(gesture as Choice);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      this.error.set('No se pudo inicializar la cámara');
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    };

    await this.mediaPipeService.initCamera(video, canvas);
  }

  ngOnDestroy(): void {
    this.mediaPipeService.stopCamera();
    this.lastSentChoice = null;
  }
}