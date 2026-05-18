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
  private stream: MediaStream | null = null;

  public getVideoStream(): MediaStream | null {
    return this.stream;
  }

  async initCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) return;

    this.videoRef = video;
    this.errorSubject.next(null);
    this.isCameraReadySubject.next(false);

    try {
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

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

      this.camera = new Camera(video, {
        onFrame: async () => {
          if (!video.videoWidth || !video.videoHeight) return;
          await this.hands.send({ image: video });
        },
        width: 640,
        height: 480,
      });

      await this.camera.start();
      await this.waitForVideoReady(video);

      try {
        await video.play();
      } catch {}

      if (video.srcObject instanceof MediaStream) {
        this.stream = video.srcObject;
      }

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      this.isInitialized = true;
      this.isCameraReadySubject.next(true);
      this.errorSubject.next(null);
    } catch (error: any) {
      this.errorSubject.next(error?.message || 'Error cámara');
      this.isCameraReadySubject.next(false);
      this.isInitialized = false;
    }
  }

  private onResults(results: Results, canvas: HTMLCanvasElement, video: HTMLVideoElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = video.videoWidth || canvas.width || 640;
    const height = video.videoHeight || canvas.height || 480;

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    if (this.videoRef) {
      const mediaStream = this.videoRef.srcObject as MediaStream | null;
      mediaStream?.getTracks().forEach((track) => track.stop());
      this.videoRef.srcObject = null;
    }

    this.stream = null;
    this.isInitialized = false;
    this.isCameraReadySubject.next(false);
    this.gestureSubject.next(null);
    this.confidenceSubject.next(0);
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        resolve();
        return;
      }

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error('Video could not initialize'));
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout waiting for camera stream'));
      }, 8000);

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('playing', onReady);
        video.removeEventListener('error', onError);
      };

      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('canplay', onReady);
      video.addEventListener('playing', onReady);
      video.addEventListener('error', onError);
    });
  }
}