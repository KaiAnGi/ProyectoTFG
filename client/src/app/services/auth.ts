import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, of } from 'rxjs';
import { environment } from '../../enviroments/enviroment';

export interface User {
  id: string;
  username: string;
  email?: string;
  guest?: boolean;
  bones?: number;
  paypalVaultId?: string;
  paypalEmail?: string;
  paypalCustomerId?: string;
}

interface AuthApiResponse {
  success: boolean;
  token?: string;
  user?: {
    _id?: string;
    username?: string;
    email?: string;
    bones?: number;
    paypalVaultId?: string;
    paypalEmail?: string;
    paypalCustomerId?: string;
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
    console.log('[AuthService] authUrl =', this.authUrl);
    const saved = sessionStorage.getItem('rps_user');
    const token = sessionStorage.getItem('rps_token');

    localStorage.removeItem('rps_user');
    localStorage.removeItem('rps_token');

    if (saved && token) {
      this.http.get<AuthApiResponse>(`${this.authUrl}/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (res) => {
          if (!res || typeof res !== 'object') {
            console.warn('[AuthService] verify returned invalid response:', res);
            this.logout();
            return;
          }
          if (res.success) {
            const parsed = JSON.parse(saved) as User & { nombre?: string };
            const normalized: User = {
              id: parsed.id || `local_${Date.now()}`,
              username: parsed.username || parsed.nombre || 'Jugador',
              email: parsed.email,
              guest: parsed.guest,
              bones: parsed.bones ?? 25,
              paypalVaultId: parsed.paypalVaultId,
              paypalEmail: parsed.paypalEmail,
              paypalCustomerId: parsed.paypalCustomerId,
            };
            this.setUser(normalized);
          } else {
            this.logout();
          }
        },
        error: () => this.logout()
      });
    }
  }

  register(data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    return this.http.post<AuthApiResponse>(`${this.authUrl}/register`, data).pipe(
      catchError((err) => {
        console.error('[AuthService] register error for', data.email, err);
        return of({ success: false, error: 'No se pudo conectar con el servidor' } as AuthApiResponse);
      }),
    );
  }

  login(data: { email: string; password: string }) {
    return this.http.post<AuthApiResponse>(`${this.authUrl}/login`, data).pipe(
      catchError((err) => {
        console.error('[AuthService] login error for', data.email, err);
        return of({ success: false, error: 'No se pudo conectar con el servidor' } as AuthApiResponse);
      }),
    );
  }

  handleAuthSuccess(response: AuthApiResponse): User {
    const user: User = {
      id: response.user?._id || `user_${Date.now()}`,
      username: response.user?.username || 'Jugador',
      email: response.user?.email,
      guest: false,
      bones: response.user?.bones ?? 25,
      paypalVaultId: response.user?.paypalVaultId,
      paypalEmail: response.user?.paypalEmail,
      paypalCustomerId: response.user?.paypalCustomerId,
    };

    if (response.token) {
      sessionStorage.setItem('rps_token', response.token);
    }

    this.setUser(user);
    return user;
  }

  loginAsGuest(): User {
    const guest: User = {
      id: 'guest_' + Date.now(),
      username: 'Invitado_' + Math.floor(Math.random() * 999),
      guest: true,
      bones: 0,
    };
    this.setUser(guest);
    return guest;
  }

  updateBones(bones: number): void {
    const current = this.currentUser();
    console.log('[AuthService] updateBones llamado. bones:', bones, 'current:', current);
    if (!current) {
      console.warn('[AuthService] updateBones: currentUser es null, saltando');
      return;
    }
    const updated: User = { ...current, bones };
    this.currentUser.set(updated);
    sessionStorage.setItem('rps_user', JSON.stringify(updated));
    this.user$.next(updated);
    console.log('[AuthService] user$ actualizado:', updated);
  }

  private setUser(user: User) {
    this.currentUser.set(user);
    sessionStorage.setItem('rps_user', JSON.stringify(user));
    this.user$.next(user);
  }

  logout() {
    this.currentUser.set(null);
    sessionStorage.removeItem('rps_user');
    sessionStorage.removeItem('rps_token');
    this.clearPaypalStorage();
    this.user$.next(null);
  }

  getToken() {
    return sessionStorage.getItem('rps_token');
  }

  getCurrentUser() {
    return this.currentUser();
  }

  clearPaypalStorage() {
    try {
      localStorage.removeItem('__paypal_storage__');
    } catch {
      // Ignore storage access issues.
    }

    try {
      sessionStorage.removeItem('__paypal_storage__');
    } catch {
      // Ignore storage access issues.
    }
  }
}