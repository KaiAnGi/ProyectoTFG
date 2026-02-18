import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './create-room.component.html',
  styleUrl: './create-room.component.css'
})
export class CreateRoomComponent {
  yourName: string = '';
  roomName: string = '';
  password: string = '';
  selectedRounds: number = 6; // Por defecto 6 rounds

  constructor(private router: Router) {}

  selectRounds(rounds: number) {
    this.selectedRounds = rounds;
  }

  onCreate(): void {
    if (this.yourName && this.roomName && this.selectedRounds) {
      console.log('Creating room:', {
        yourName: this.yourName,
        roomName: this.roomName,
        password: this.password,
        rounds: this.selectedRounds
      });
      // TODO: Llamar al servicio para crear la sala
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
