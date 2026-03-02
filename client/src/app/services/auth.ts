import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface User {
  id: string;
  username: string;
  guest?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());
  
  user$ = new BehaviorSubject<User | null>(null);

  constructor() {
    const saved = localStorage.getItem('rps_user');
    if (saved) {
      const user = JSON.parse(saved) as User;
      this.currentUser.set(user);
      this.user$.next(user);
    }
  }

  loginAsGuest(): User {
    const guest: User = {
      id: 'guest_' + Date.now(),
      username: 'Invitado_' + Math.floor(Math.random() * 999),
      guest: true
    };
    this.setUser(guest);
    return guest;
  }

  private setUser(user: User) {
    this.currentUser.set(user);
    localStorage.setItem('rps_user', JSON.stringify(user));
    this.user$.next(user);
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('rps_user');
    this.user$.next(null);
  }

  getCurrentUser() { return this.currentUser(); }
}
