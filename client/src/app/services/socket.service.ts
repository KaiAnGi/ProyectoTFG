import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../enviroments/enviroment';

interface SocketEvent {
  [event: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket = io(environment.socketUrl, { autoConnect: false });
  private eventSubjects: { [key: string]: Subject<any> } = {};

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  emit(event: string, data: any): void {
    this.socket.emit(event, data);
  }

  on(event: string): Observable<any> {
    if (!this.eventSubjects[event]) {
      this.eventSubjects[event] = new Subject<any>();
      this.socket.on(event, (data: any) => {
        this.eventSubjects[event].next(data);
      });
    }
    return this.eventSubjects[event].asObservable();
  }

  isConnected(): boolean {
    return this.socket.connected;
  }
}
