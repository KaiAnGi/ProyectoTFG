import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../enviroments/enviroment';

export interface User {
  id: string;
  username: string;
  email?: string;
  guest?: boolean;
}

interface AuthApiResponse {
  success: boolean;
  token?: string;
  user?: {
    _id?: string;
    username?: string;
    email?: string;
  };
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly authUrl = `${environment.apiUrl}/auth`;

  private currentUser = signal<User | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());
  
  user$ = new BehaviorSubject<User | null>(null);

  constructor() {
    const saved = localStorage.getItem('rps_user');
    if (saved) {
      const parsed = JSON.parse(saved) as User & { nombre?: string };
      const normalized: User = {
        id: parsed.id || `local_${Date.now()}`,
        username: parsed.username || parsed.nombre || 'Jugador',
        email: parsed.email,
        guest: parsed.guest,
      };
      this.setUser(normalized);
    }
  }

  register(data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    return this.http.post<AuthApiResponse>(`${this.authUrl}/register`, data);
  }

  login(data: { email: string; password: string }) {
    return this.http.post<AuthApiResponse>(`${this.authUrl}/login`, data);
  }

  handleAuthSuccess(response: AuthApiResponse): User {
    const user: User = {
      id: response.user?._id || `user_${Date.now()}`,
      username: response.user?.username || 'Jugador',
      email: response.user?.email,
      guest: false,
    };

    if (response.token) {
      localStorage.setItem('rps_token', response.token);
    }

    this.setUser(user);
    return user;
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
    localStorage.removeItem('rps_token');
    this.user$.next(null);
  }

  getToken() { return localStorage.getItem('rps_token'); }
  getCurrentUser() { return this.currentUser(); }
}
