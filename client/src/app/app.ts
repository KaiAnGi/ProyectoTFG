import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserMenuComponent } from './shared/user-menu/user-menu.component';
import { AudioService } from './services/audio';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UserMenuComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('client');
  muted = false;

  constructor(private audio: AudioService) {}

  ngOnInit() {
    this.audio.preload('mensaje', '/sounds/mensaje.mp3');
    this.audio.playMusic('/sounds/musicaFondo.mp3', 0.2);
  }

  toggleMute() {
    this.muted = this.audio.toggleMute();
  }
}