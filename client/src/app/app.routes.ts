import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { RoomMenuComponent } from './features/room-menu/room-menu.component';
import { CreateRoomComponent } from './features/create-room/create-room.component';
import { JoinRoomComponent } from './features/join-room/join-room.component';
import { WaitingRoomComponent } from './features/waiting-room/waiting-room.component';
import { AuthComponent } from './features/auth/auth';
import { RegisterComponent } from './features/register/register';
import { LoginComponent } from './features/login/login';
import { GameComponent } from './features/game/game.component';
import { GestureDetectorComponent } from './features/game/game-components/gesture-detector/gesture-detector.component';
import { LeaderboardComponent } from './features/leaderboard/leaderboard.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'room-menu', component: RoomMenuComponent },
  { path: 'create-room', component: CreateRoomComponent },
  { path: 'join-room', component: JoinRoomComponent },
  { path: 'waiting-room', component: WaitingRoomComponent },
  { path: 'game', component: GameComponent },
  { path: 'gesture-detector', component: GestureDetectorComponent },
  { path: 'leaderboard', component: LeaderboardComponent },
  { path: '**', redirectTo: '' },
];
