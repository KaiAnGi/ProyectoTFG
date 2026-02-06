import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Hands, Results, NormalizedLandmarkList } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export type GestureType = 'rock' | 'paper' | 'scissors' | null;

@Injectable({
  providedIn: 'root'
})
export class MediaPipeService {
  // Subjects para observables
  private gestureSubject = new BehaviorSubject<GestureType>(null);
  private confidenceSubject = new BehaviorSubject<number>(0);
  private isCameraReadySubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Observables públicos
  public currentGesture$ = this.gestureSubject.asObservable();
  public confidence$ = this.confidenceSubject.asObservable();
  public isCameraReady$ = this.isCameraReadySubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  // Estado interno
  private hands!: Hands;
  private camera!: Camera;
  private isInitialized = false;

  /**
   * Inicializar cámara - RECIBE elementos DOM desde fuera
   */
  async initCamera(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. Esperar video listo
      await this.waitForVideoReady(videoElement);

      // 2. Inicializar Hands
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      // 3. Configurar callback
      this.hands.onResults((results: Results) => this.onResults(results));

      // 4. Esperar Hands listo
      await new Promise(resolve => setTimeout(resolve, 500));

      // 5. Iniciar cámara
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.hands && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            try {
              await this.hands.send({ image: videoElement });
            } catch (error) {
              console.warn('Error send frame:', error);
            }
          }
        },
        width: 320,
        height: 240
      });

      await this.camera.start();
      this.isInitialized = true;
      this.isCameraReadySubject.next(true);
      this.errorSubject.next(null);

    } catch (error: any) {
      this.errorSubject.next(error.message || 'Error al iniciar cámara');
      this.isCameraReadySubject.next(false);
      console.error('MediaPipe error:', error);
    }
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise(resolve => {
      if (video.readyState >= 2) return resolve(void 0);

      const check = () => {
        if (video.readyState >= 2) {
          video.removeEventListener('loadeddata', check);
          resolve(void 0);
        }
      };

      video.addEventListener('loadeddata', check);
      setTimeout(() => {
        video.removeEventListener('loadeddata', check);
        resolve(void 0);
      }, 2000);
    });
  }

  private onResults(results: Results): void {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.gestureSubject.next(null);
      this.confidenceSubject.next(0);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const gestureDetection = this.detectGesture(landmarks);

    this.gestureSubject.next(gestureDetection.gesture);
    this.confidenceSubject.next(gestureDetection.confidence);
  }

  private detectGesture(landmarks: NormalizedLandmarkList): { gesture: GestureType; confidence: number } {
    // Landmarks clave
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];

    // Detectar dedos extendidos
    const isThumbExtended = thumbTip.x < landmarks[3].x - 0.05;
    const isIndexExtended = indexTip.y < indexMCP.y;
    const isMiddleExtended = middleTip.y < middleMCP.y;
    const isRingExtended = ringTip.y < ringMCP.y;
    const isPinkyExtended = pinkyTip.y < pinkyMCP.y;

    const extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended]
      .filter(Boolean).length;

    // PIEDRA: Puño cerrado
    if (extendedCount <= 1 && !isThumbExtended) {
      return { gesture: 'rock', confidence: 0.90 };
    }

    // PAPEL: Mano abierta
    if (extendedCount >= 4 || (extendedCount === 4 && isThumbExtended)) {
      return { gesture: 'paper', confidence: 0.85 };
    }

    // TIJERA: Índice + medio extendidos
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { gesture: 'scissors', confidence: 0.88 };
    }

    return { gesture: null, confidence: 0 };
  }

  stopCamera(): void {
    if (this.camera) {
      this.camera.stop();
    }
    if (this.hands) {
      this.hands.close();
    }
    this.isInitialized = false;
    this.isCameraReadySubject.next(false);
    this.gestureSubject.next(null);
    this.confidenceSubject.next(0);
  }

  // Getters públicos para estado actual
  getCurrentGesture(): GestureType {
    return this.gestureSubject.value;
  }

  getConfidence(): number {
    return this.confidenceSubject.value;
  }

  isCameraReady(): boolean {
    return this.isCameraReadySubject.value;
  }
}
