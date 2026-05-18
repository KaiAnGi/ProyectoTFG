import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserMenuComponent } from './shared/user-menu/user-menu.component';
import { HudComponent } from './shared/hud/hud.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UserMenuComponent, HudComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');
}