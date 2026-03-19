// media-pipe.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Hands, Results, NormalizedLandmarkList } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { GestureDetectorService } from './gesture-detector.service';
import { HandRendererService } from './hand-renderer.service';

export type GestureType = 'rock' | 'paper' | 'scissors' | null;

@Injectable({ providedIn: 'root' })
export class MediaPipeService {
  private gestureDetector = inject(GestureDetectorService);
  private handRenderer = inject(HandRendererService);

  private gestureSubject = new BehaviorSubject<GestureType>(null);
  private confidenceSubject = new BehaviorSubject<number>(0);
  private isCameraReadySubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public currentGesture$ = this.gestureSubject.asObservable();
  public confidence$ = this.confidenceSubject.asObservable();
  public isCameraReady$ = this.isCameraReadySubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  private hands!: Hands;
  private camera!: Camera;
  private videoRef!: HTMLVideoElement;
  private isInitialized = false;

  async initCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) return;

    this.videoRef = video;

    try {
      await this.waitForVideoReady(video);
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`,
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.hands.onResults((results: Results) => this.onResults(results, canvas, video));

      await new Promise((resolve) => setTimeout(resolve, 1500));

      this.camera = new Camera(video, {
        onFrame: () => this.hands.send({ image: video }),
        width: 640,
        height: 480,
      });

      await this.camera.start();

      this.isInitialized = true;
      this.isCameraReadySubject.next(true);
      this.errorSubject.next(null);
    } catch (error: any) {
      this.errorSubject.next(error.message || 'Error cámara');
      this.isCameraReadySubject.next(false);
    }
  }

  private onResults(results: Results, canvas: HTMLCanvasElement, video: HTMLVideoElement): void {
    const ctx = canvas.getContext('2d')!;

    // RESET TOTAL del estado del canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks?.[0]) {
      const landmarks = results.multiHandLandmarks[0] as NormalizedLandmarkList;

      this.handRenderer.drawSkeleton(ctx, landmarks, canvas.width, canvas.height);

      const detection = this.gestureDetector.detect(landmarks);

      this.gestureSubject.next(detection.gesture);
      this.confidenceSubject.next(detection.confidence);
    } else {
      this.gestureSubject.next(null);
      this.confidenceSubject.next(0);
    }
  }

  stopCamera(): void {
    this.camera?.stop();
    this.hands?.close();
    this.isInitialized = false;
    this.isCameraReadySubject.next(false);
    this.gestureSubject.next(null);
    this.confidenceSubject.next(0);
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    console.log('Esperando video... readyState:', video.readyState);

    return new Promise((resolve) => {
      if (video.readyState >= 2) {
        console.log('Video YA listo');
        return resolve();
      }

      const checkReady = () => {
        console.log('Chequeando... readyState:', video.readyState);
        if (video.readyState >= 2) {
          video.removeEventListener('loadeddata', checkReady);
          video.removeEventListener('canplay', checkReady);
          console.log('Video listo!');
          resolve();
        }
      };

      video.addEventListener('loadeddata', checkReady);
      video.addEventListener('canplay', checkReady);

      // Timeout seguridad
      setTimeout(() => {
        video.removeEventListener('loadeddata', checkReady);
        video.removeEventListener('canplay', checkReady);
        console.log('Timeout - asumiendo listo');
        resolve();
      }, 5000);
    });
  }
}
