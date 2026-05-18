import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './services/auth';
import { UserMenuComponent } from './shared/user-menu/user-menu.component';
import { HudComponent } from './shared/hud/hud.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, UserMenuComponent, HudComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('client');
  protected readonly showUserChrome = signal(false);

  private authSub?: Subscription;
  private routerSub?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const refreshChromeVisibility = () => {
      const currentUser = this.authService.getCurrentUser();
      const route = this.router.url;
      const isAuthSurface = route === '/' || route.startsWith('/auth') || route.startsWith('/login') || route.startsWith('/register');
      this.showUserChrome.set(!!currentUser && !currentUser.guest && !isAuthSurface);
    };

    this.authSub = this.authService.user$.subscribe(() => refreshChromeVisibility());
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => refreshChromeVisibility());

    refreshChromeVisibility();
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }
}