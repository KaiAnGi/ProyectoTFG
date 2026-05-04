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
  private socket!: Socket;
  private eventSubjects: { [key: string]: Subject<any> } = {};
  private authService = inject(AuthService);

  connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const user = this.authService.getCurrentUser();
    const token = localStorage.getItem('rps_token');

    this.socket = io(environment.socketUrl, {
      autoConnect: true,
      auth: {
        username: user?.username || '',
        token: token || '',
      },
    });

    // Reconectar en caso de desconexión
    this.socket.on('connect', () => {
      console.log('Socket conectado:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket desconectado');
    });
  }

  disconnect(): void {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
  }

  emit(event: string, data: any): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit(event, data);
  }

  on(event: string): Observable<any> {
    if (!this.socket) {
      this.connect();
    }
    if (!this.eventSubjects[event]) {
      this.eventSubjects[event] = new Subject<any>();
      this.socket?.on(event, (data: any) => {
        this.eventSubjects[event].next(data);
      });
    }
    return this.eventSubjects[event].asObservable();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
