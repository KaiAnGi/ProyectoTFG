// hand-renderer.service.ts
import { Injectable } from '@angular/core';
import { NormalizedLandmarkList } from '@mediapipe/hands';

@Injectable({ providedIn: 'root' })
export class HandRendererService {
  drawSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmarkList,
    width: number,
    height: number,
  ): void {
    this.setupCanvas(ctx);
    this.drawBones(ctx, landmarks, width, height);
    this.drawJoints(ctx, landmarks, width, height);
    ctx.restore();
  }

  private setupCanvas(ctx: CanvasRenderingContext2D): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
  }

  private drawBones(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmarkList,
    width: number,
    height: number,
  ): void {
    const boneConnections = [
      [0, 1],
      [0, 5],
      [0, 9],
      [0, 13],
      [0, 17],
      [5, 9],
      [9, 13],
      [13, 17], // Palma
      [1, 2],
      [2, 3],
      [3, 4],
      [5, 6],
      [6, 7],
      [7, 8],
      [9, 10],
      [10, 11],
      [11, 12],
      [13, 14],
      [14, 15],
      [15, 16],
      [17, 18],
      [18, 19],
      [19, 20], // Dedos
    ];

    boneConnections.forEach(([startIdx, endIdx], index) => {
      const start = landmarks[startIdx],
        end = landmarks[endIdx];
      const x1 = start.x * width,
        y1 = start.y * height;
      const x2 = end.x * width,
        y2 = end.y * height;

      // Hueso con gradiente 3D
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      const isMetacarpal = index < 8;
      gradient.addColorStop(0, isMetacarpal ? '#f5f5f5' : '#e8e8e8');
      gradient.addColorStop(0.5, isMetacarpal ? '#d0d0d0' : '#c8c8c8');
      gradient.addColorStop(1, isMetacarpal ? '#b8b8b8' : '#a8a8a8');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = isMetacarpal ? 8 : 5;
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Brillo del hueso
      this.drawBoneHighlight(ctx, x1, y1, x2, y2);
    });
  }

  private drawBoneHighlight(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): void {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1 + (x2 - x1) * 0.2, y1 + (y2 - y1) * 0.2);
    ctx.lineTo(x2 - (x2 - x1) * 0.2, y2 - (y2 - y1) * 0.2);
    ctx.stroke();
  }

  private drawJoints(
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmarkList,
    width: number,
    height: number,
  ): void {
    const joints = [0, 1, 5, 9, 13, 17, 4, 8, 12, 16, 20];

    joints.forEach((jointIdx) => {
      const joint = landmarks[jointIdx];
      const jx = joint.x * width,
        jy = joint.y * height;
      const radius = jointIdx === 0 ? 12 : jointIdx <= 17 ? 9 : 7;
      this.drawJoint(ctx, jx, jy, radius);
    });
  }

  private drawJoint(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    // Sombra proyectada
    ctx.shadowBlur = 25;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowOffsetY = 3;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#f0f0f0');
    gradient.addColorStop(0.7, '#d0d0d0');
    gradient.addColorStop(1, '#a0a0a0');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Borde + highlight
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#888';
    ctx.stroke();
  }
}
