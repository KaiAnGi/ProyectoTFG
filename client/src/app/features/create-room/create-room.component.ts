import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.css']
})
export class CreateRoomComponent implements OnInit {
  roomName = '';
  password = '';
  username = '';
  selectedRounds = 3;

  constructor(
    private router: Router,
    private auth: AuthService,
    private gameService: GameService,
  ) {}


  selectRounds(rounds: number) {
    this.selectedRounds = rounds;
  }

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.username = user.username;
      return;
    }

    this.router.navigate(['/auth']);
  }

  onCreate() {
    this.gameService.createRoom(this.username, this.selectedRounds as 3 | 5 | 9);
    this.router.navigate(['/waiting-room']);
  }

  onCancel() { this.router.navigate(['/room-menu']); }
  onBack() { this.router.navigate(['/room-menu']); }
}
