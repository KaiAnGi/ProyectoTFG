import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GameComponent } from "./features/game/game.component";
import { HomeComponent } from "./features/home/home.component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GameComponent, HomeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('client');
}
