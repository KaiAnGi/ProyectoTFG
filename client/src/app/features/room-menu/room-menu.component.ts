import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-room-menu',
  standalone: true,
  imports: [],
  templateUrl: './room-menu.component.html',
  styleUrl: './room-menu.component.css'
})
export class RoomMenuComponent {
  constructor(private router: Router) { }

  onCreateRoom() {
    this.router.navigate(['/create-room']);
  }


  onJoinRoom() {
    this.router.navigate(['/join-room']);
  }

  onBack() {
    this.router.navigate(['/']);
  }
}
