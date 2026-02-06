import { Injectable, signal } from '@angular/core';
import { NormalizedLandmarkList } from '@mediapipe/hands';

export type GestureType = 'rock' | 'paper' | 'scissors' | null;

@Injectable({ providedIn: 'root' })
export class GestureDetectionService {
  currentGesture = signal<GestureType>(null);
  confidence = signal<number>(0);

  detectGesture(landmarks: NormalizedLandmarkList): { gesture: GestureType; confidence: number } {
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

    const isThumbExtended = thumbTip.x < landmarks[3].x - 0.05;
    const isIndexExtended = indexTip.y < indexMCP.y;
    const isMiddleExtended = middleTip.y < middleMCP.y;
    const isRingExtended = ringTip.y < ringMCP.y;
    const isPinkyExtended = pinkyTip.y < pinkyMCP.y;

    const extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended]
      .filter(Boolean).length;

    // 🪨 PIEDRA
    if (extendedCount <= 1 && !isThumbExtended) {
      return { gesture: 'rock', confidence: 0.9 };
    }

    // ✋ PAPEL
    if (extendedCount >= 4 || (extendedCount === 4 && isThumbExtended)) {
      return { gesture: 'paper', confidence: 0.85 };
    }

    // ✂️ TIJERA
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { gesture: 'scissors', confidence: 0.88 };
    }

    return { gesture: null, confidence: 0 };
  }
}
