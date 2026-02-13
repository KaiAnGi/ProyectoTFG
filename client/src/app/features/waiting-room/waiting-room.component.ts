import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-waiting-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.css']
})
export class WaitingRoomComponent {
  // Datos de ejemplo (luego vendrán del servicio de socket)
  roomCode: string = 'KDS865';
  roomName: string = "Son's of MELOLA";
  
  player1 = {
    name: 'You',
    isReady: false,  // Cambiado a false por defecto
    isYou: true
  };
  
  player2 = {
    name: 'Opponent',
    isReady: false,
    isYou: false
  };

  constructor(private router: Router) {}

  // Toggle del estado ready del jugador 1
  toggleReady(): void {
    this.player1.isReady = !this.player1.isReady;
    console.log('Player 1 ready status:', this.player1.isReady);
    // TODO: Emitir evento por socket
  }

  canStartGame(): boolean {
    return this.player1.isReady && this.player2.isReady;
  }

  startGame(): void {
    if (this.canStartGame()) {
      // TODO: Navegar a pantalla de juego
      console.log('Starting game...');
    }
  }

  leaveRoom(): void {
    // TODO: Desconectar del socket y volver al menú
    this.router.navigate(['/room-menu']);
  }

  goBack(): void {
    this.router.navigate(['/room-menu']);
  }
}
