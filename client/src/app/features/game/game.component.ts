// import { Component, inject, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { RouterLink } from '@angular/router';
// import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// import { GameService } from '../../services/game.service';
// import { MediaPipeService, GestureType } from '../../services/mediapipe.service';
// import { GameState, Choice } from '../../models/game-state.model';
// import { StatusPanelComponent } from '../../components/status-panel/status-panel.component';
// import { GameArenaComponent } from '../../components/game-arena/game-arena.component';
// import { ActionButtonsComponent } from '../../components/action-buttons/action-buttons.component';
// import { GestureDetectorComponent } from '../../components/gesture-detector/gesture-detector.component';
// import { HistoryComponent } from '../../components/history/history.component';

// @Component({
//   selector: 'app-game',
//   standalone: true,
//   imports: [
//     CommonModule,
//     RouterLink,
//     StatusPanelComponent,
//     GameArenaComponent,
//     ActionButtonsComponent,
//     GestureDetectorComponent,
//     HistoryComponent,
//   ],
//   templateUrl: './game.component.html',
//   styleUrls: ['./game.component.css']
// })
// export class GameComponent {
//   private gameService = inject(GameService);
//   private mediaPipeService = inject(MediaPipeService);
//   private router = inject(Router);

//   gameState$ = this.gameService.gameState$;
//   currentGesture$ = this.mediaPipeService.currentGesture$;
//   isCameraReady$ = this.mediaPipeService.isCameraReady$;

//   ngOnInit(): void {
//     this.gameState$
//       .pipe(takeUntilDestroyed())
//       .subscribe(state => {
//         if (!state.roomId) {
//           this.router.navigate(['/']);
//         }
//       });

//     // Auto-jugar con gestos
//     this.currentGesture$
//       .pipe(takeUntilDestroyed())
//       .subscribe(gesture => {
//         if (gesture && this.gameService.gameState$.value.isRoundActive) {
//           this.onGestureDetected(gesture);
//         }
//       });
//   }

//   onPlayerChoice(choice: Choice): void {
//     this.gameService.makeChoice(choice);
//   }

//   onGestureDetected(gesture: GestureType): void {
//     if (gesture) {
//       this.gameService.makeChoice(gesture as Choice);
//     }
//   }

//   async toggleCamera(): Promise<void> {
//     if (this.mediaPipeService.isCameraReady$.value) {
//       this.mediaPipeService.stopCamera();
//     } else {
//       await this.mediaPipeService.initCamera();
//     }
//   }

//   leaveGame(): void {
//     this.gameService.resetGame();
//     this.router.navigate(['/']);
//   }
// }

/* COMENTADO TEMPORALMENTE POR KAREN - ERRORES DE COMPILACIÓN

// ... pega aquí TODO el contenido actual del archivo

FIN DEL COMENTARIO */

// Componente temporal vacío para que compile
import { Component } from '@angular/core';

@Component({
  selector: 'app-game',
  standalone: true,
  template: '<div>Game component - En desarrollo</div>',
  styles: []
})
export class GameComponent {}
