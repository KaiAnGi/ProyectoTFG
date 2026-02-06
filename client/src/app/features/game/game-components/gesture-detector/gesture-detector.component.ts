import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Hands, Results, NormalizedLandmarkList } from '@mediapipe/hands';  // ✅ Import faltante
import { Camera } from '@mediapipe/camera_utils';

export type GestureType = 'rock' | 'paper' | 'scissors' | null;

@Injectable({
  providedIn: 'root'
})
export class MediaPipeService {
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
  private isInitialized = false;

  async initCamera(
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎥 Iniciando MediaPipe...');

      // 1. Esperar video listo
      await this.waitForVideoReady(videoElement);

      // 2. Crear Hands
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      // 3. Configurar ANTES de onResults
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      // 4. Configurar callback
      this.hands.onResults((results: Results) => this.onResults(results));

      // 5. ESPERAR modelo cargado
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 6. Iniciar cámara CON verificaciones
      this.camera = new Camera(videoElement, {
        onFrame: async () => {
          if (this.hands &&
              videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            try {
              await this.hands.send({ image: videoElement });
            } catch (error) {
              console.warn('Frame error:', error);
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
      console.log('MediaPipe listo!');

    } catch (error: any) {
      console.error('MediaPipe error:', error);
      this.errorSubject.next(error.message || 'Error cámara');
      this.isCameraReadySubject.next(false);
    }
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise(resolve => {
      if (video.readyState >= 2) return resolve();

      const checkReady = () => {
        if (video.readyState >= 2) {
          video.removeEventListener('loadeddata', checkReady);
          resolve();
        }
      };

      video.addEventListener('loadeddata', checkReady);
      setTimeout(() => {
        video.removeEventListener('loadeddata', checkReady);
        resolve();
      }, 3000);
    });
  }

  private onResults(results: Results): void {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.gestureSubject.next(null);
      this.confidenceSubject.next(0);
      return;
    }

    const landmarks = results.multiHandLandmarks[0];
    const { gesture, confidence } = this.detectGesture(landmarks);

    this.gestureSubject.next(gesture);
    this.confidenceSubject.next(confidence);
  }

  private detectGesture(landmarks: NormalizedLandmarkList): { gesture: GestureType; confidence: number } {
    // Landmarks clave (21 puntos de MediaPipe Hands)
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];

    // Detectar extensión de dedos
    const isIndexExtended = indexTip.y < indexMCP.y;
    const isMiddleExtended = middleTip.y < middleMCP.y;
    const isThumbExtended = thumbTip.x < landmarks[3].x - 0.05;

    const extendedFingers = [isIndexExtended, isMiddleExtended].filter(Boolean).length;

    // PIEDRA: Puño (0 dedos)
    if (extendedFingers === 0) {
      return { gesture: 'rock', confidence: 0.90 };
    }

    // TIJERA: Índice + medio (2 dedos)
    if (isIndexExtended && isMiddleExtended) {
      return { gesture: 'scissors', confidence: 0.88 };
    }

    // PAPEL: Mano abierta (resto)
    return { gesture: 'paper', confidence: 0.75 };
  }

  stopCamera(): void {
    try {
      this.camera?.stop();
      this.hands?.close();
    } catch (error) {
      console.warn('Error stop:', error);
    }

    this.isInitialized = false;
    this.isCameraReadySubject.next(false);
    this.gestureSubject.next(null);
    this.confidenceSubject.next(0);
    this.errorSubject.next(null);
  }

  // Getters públicos
  getCurrentGesture(): GestureType {
    return this.gestureSubject.value;
  }

  getConfidence(): number {
    return this.confidenceSubject.value;
  }

  isCameraReady(): boolean {
    return this.isCameraReadySubject.value;
  }

  getError(): string | null {
    return this.errorSubject.value;
  }
}
