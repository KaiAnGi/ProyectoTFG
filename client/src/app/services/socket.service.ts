import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../enviroments/enviroment';
import { AuthService } from './auth';

interface SocketEvent {
  [event: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket?: Socket;
  private eventSubjects: { [key: string]: Subject<any> } = {};
  private authService = inject(AuthService);

  private attachedEvents = new Set<string>();

  connect(): void {
    const user = this.authService.getCurrentUser();
    const token = sessionStorage.getItem('rps_token');

    if (!user?.username) {
      return;
    }

    const currentAuth = (this.socket as any)?.auth;
    const authChanged =
      !this.socket ||
      currentAuth?.username !== user.username ||
      currentAuth?.token !== (token || '');

    if (this.socket && authChanged) {
      this.socket.disconnect();
      this.socket = undefined;
      this.attachedEvents.clear();
    }

    if (!this.socket) {
      this.socket = io(environment.socketUrl, {
        autoConnect: true,
        auth: {
          username: user.username,
          token: token || '',
        },
      });

      this.socket.on('connect', () => {
        console.log('Socket conectado:', this.socket?.id);
        this.attachEventListeners();
      });

      this.socket.on('disconnect', () => {
        console.log('Socket desconectado');
      });
    } else if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
      this.attachedEvents.clear();
    }
  }

  emit(event: string, data: any, callback?: (response: any) => void): void {
    if (!this.socket || !this.socket.connected) {
      this.connect();
    }
    if (callback) {
      this.socket?.emit(event, data, callback);
    } else {
      this.socket?.emit(event, data);
    }
  }

  on(event: string): Observable<any> {
    if (!this.eventSubjects[event]) {
      this.eventSubjects[event] = new Subject<any>();
    }

    if (!this.socket) {
      this.connect();
    }

    if (this.socket?.connected && !this.attachedEvents.has(event)) {
      this.attachEventListener(event);
    }

    return this.eventSubjects[event].asObservable();
  }

  private attachEventListener(event: string): void {
    const socket = this.socket;
    if (!socket || this.attachedEvents.has(event)) {
      return;
    }

    socket.on(event, (data: any) => {
      this.eventSubjects[event].next(data);
    });
    this.attachedEvents.add(event);
  }

  private attachEventListeners(): void {
    const socket = this.socket;
    if (!socket) {
      return;
    }

    Object.keys(this.eventSubjects).forEach((event) => {
      this.attachEventListener(event);
    });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
