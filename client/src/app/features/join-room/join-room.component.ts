import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-join-room',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './join-room.component.html',
  styleUrl: './join-room.component.css'
})
export class JoinRoomComponent {
  yourName: string = '';
  roomName: string = '';
  roomCode: string = '';
  password: string = '';

  constructor(private router: Router) { }

  onJoin(): void {
    if (this.yourName && this.roomCode) {
      console.log('Joining room:', {
        yourName: this.yourName,
        roomName: this.roomName,
        roomCode: this.roomCode,
        password: this.password
      });
      // TODO: Llamar al servicio para unirse a la sala
      this.router.navigate(['/waiting-room']);
    }
  }

  onCancel() {
    this.router.navigate(['/room-menu']);
  }

  onBack() {
    this.router.navigate(['/room-menu']);
  }
}
