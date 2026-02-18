import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { RoomMenuComponent } from './features/room-menu/room-menu.component';
import { CreateRoomComponent } from './features/create-room/create-room.component';
import { JoinRoomComponent } from './features/join-room/join-room.component';
import { WaitingRoomComponent } from './features/waiting-room/waiting-room.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'room-menu', component: RoomMenuComponent },
  { path: 'create-room', component: CreateRoomComponent },
  { path: 'join-room', component: JoinRoomComponent },
  { path: 'waiting-room', component: WaitingRoomComponent},
  { path: '**', redirectTo: '' }
];
