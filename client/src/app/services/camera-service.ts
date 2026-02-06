import { Injectable, inject } from '@angular/core';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { GestureDetectionService } from './gesture-detection.service';

@Injectable({ providedIn: 'root' })
export class CameraService {
  private gestureDetector = inject(GestureDetectionService);

  private hands: Hands | null = null;
  private camera: Camera | null = null;
  private isInitialized = false;

  async initCamera(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. ESPERAR a que el video esté listo
      await this.waitForVideoReady(video);

      // 2. Inicializar Hands COMPLETAMENTE
      this.hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
      });

      // 3. Configurar options ANTES de onResults
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      // 4. Configurar callback
      this.hands.onResults((results: Results) => {
        const landmarks = results.multiHandLandmarks?.[0];
        if (landmarks) {
          const detection = this.gestureDetector.detectGesture(landmarks);
          this.gestureDetector.currentGesture.set(detection.gesture);
          this.gestureDetector.confidence.set(detection.confidence);
        } else {
          this.gestureDetector.currentGesture.set(null);
          this.gestureDetector.confidence.set(0);
        }
      });

      // 5. ESPERAR a que Hands esté listo
      await this.waitForHandsReady();

      // 6. Iniciar cámara
      this.camera = new Camera(video, {
        onFrame: async () => {
          if (this.hands && video.readyState === video.HAVE_ENOUGH_DATA) {
            try {
              await this.hands.send({ image: video });
            } catch (error) {
              console.warn('Error en hands.send:', error);
            }
          }
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.isInitialized = true;

    } catch (error) {
      console.error('Error initCamera:', error);
      throw error;
    }
  }

  private async waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      if (video.readyState >= 2) { // HAVE_ENOUGH_DATA
        return resolve();
      }

      const checkReady = () => {
        if (video.readyState >= 2) {
          video.removeEventListener('loadeddata', checkReady);
          resolve();
        }
      };

      video.addEventListener('loadeddata', checkReady);
      video.addEventListener('canplay', checkReady);

      // Timeout de seguridad
      setTimeout(() => {
        video.removeEventListener('loadeddata', checkReady);
        resolve();
      }, 2000);
    });
  }

  private async waitForHandsReady(): Promise<void> {
    return new Promise((resolve) => {
      const checkHands = () => {
        if (this.hands) {
          // Verificar que el modelo se cargó
          (this.hands as any).isReady ? resolve() : setTimeout(checkHands, 100);
        }
      };
      checkHands();
    });
  }

  stopCamera(): void {
    this.camera?.stop();
    this.hands?.close();
    this.isInitialized = false;
  }
}
