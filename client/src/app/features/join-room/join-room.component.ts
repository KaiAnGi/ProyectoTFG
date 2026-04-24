import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-join-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './join-room.component.html',
  styleUrls: ['./join-room.component.css'],
})
export class JoinRoomComponent implements OnInit {
  roomName = '';
  roomCode = '';
  password = '';

  username = ''; // se rellena solo desde AuthService

  constructor(
    private router: Router,
    private auth: AuthService,
    private gameService: GameService,
  ) {}

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.username = user.username; // coge nombre del usuario logueado, creo xd
      return;
    }

    this.router.navigate(['/auth']);
  }

  onJoin() {
    const roomId = this.roomCode.trim();
    if (!roomId) return;

    this.gameService.joinRoom(roomId, this.username, this.roomName);
    this.router.navigate(['/waiting-room']);
  }

  onCancel() {
    this.router.navigate(['/room-menu']);
  }
  onBack() {
    this.router.navigate(['/room-menu']);
  }
}
