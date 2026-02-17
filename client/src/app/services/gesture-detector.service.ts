// gesture-detector.service.ts
import { Injectable } from '@angular/core';
import { NormalizedLandmarkList } from '@mediapipe/hands';
import { GestureType } from './mediapipe.service';

@Injectable({ providedIn: 'root' })
export class GestureDetectorService {
  detect(landmarks: NormalizedLandmarkList): { gesture: GestureType; confidence: number } {
    const thumbTip = landmarks[4], indexTip = landmarks[8];
    const middleTip = landmarks[12], ringTip = landmarks[16], pinkyTip = landmarks[20];
    const indexMCP = landmarks[5], middleMCP = landmarks[9], ringMCP = landmarks[13], pinkyMCP = landmarks[17];

    const isThumbExtended = thumbTip.x < landmarks[3].x - 0.05;
    const isIndexExtended = indexTip.y < indexMCP.y;
    const isMiddleExtended = middleTip.y < middleMCP.y;
    const isRingExtended = ringTip.y < ringMCP.y;
    const isPinkyExtended = pinkyTip.y < pinkyMCP.y;

    const extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(Boolean).length;

    if (extendedCount <= 1 && !isThumbExtended) return { gesture: 'rock', confidence: 0.9 };
    if (extendedCount >= 4 || (extendedCount === 4 && isThumbExtended)) return { gesture: 'paper', confidence: 0.85 };
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) return { gesture: 'scissors', confidence: 0.88 };

    return { gesture: null, confidence: 0 };
  }
}
