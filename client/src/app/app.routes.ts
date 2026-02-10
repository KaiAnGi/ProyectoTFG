import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'Juego',
    children: [
      // GESTURE DETECTOR
      {
        path: 'GestureDetector',
        loadComponent: () => import('./features/game/game-components/gesture-detector/gesture-detector.component')
          .then(m => m.GestureDetectorComponent)
      },

      // Otras rutas del juego (echadles un vistazo)
      //{ path: 'Ranking', loadComponent: () => import('./features/game/ranking/ranking.component').then(m => m.RankingComponent) },
      //{ path: 'Chat', loadComponent: () => import('./features/game/chat/chat.component').then(m => m.ChatComponent) },
      //{ path: 'Salas', loadComponent: () => import('./features/game/rooms/rooms.component').then(m => m.RoomsComponent) },

      // Ruta de login
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },

  // Ruta principal (home/lobby)
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // Ruta comodín (esto es mio cabrones, no toqueis)
  { path: '**', redirectTo: '/Juego/GestureDetector' }
];
