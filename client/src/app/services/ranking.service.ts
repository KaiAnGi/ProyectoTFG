import { Injectable, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import type { ILeaderboard } from '../models/leaderboard';
import { environment } from '../../enviroments/enviroment';

@Injectable({ providedIn: 'root' })
export class RankingService {
  private http = inject(HttpClient);
  private socket!: Socket;
  private leaderboardSubject = new BehaviorSubject<ILeaderboard[]>([]);

  readonly baseUrl = environment.apiUrl; // Type-safe and not exposed
  readonly leaderboard$ = this.leaderboardSubject.asObservable();

  constructor() {
    // effect() runs when the service is instantiated (first injection)
    effect(() => {
      this.connectSocket();
    });
  }

  private connectSocket() {
    this.socket = io(environment.socketUrl);
    this.socket.on('leaderboard:update', (data: ILeaderboard[]) => {
      this.leaderboardSubject.next(data);
    });
  }

  getTopRanking(limit: number = 50): Observable<ILeaderboard[]> {
    return this.http.get<ILeaderboard[]>(`${this.baseUrl}/ranking?limit=${limit}`);
  }

  loadInitial() {
    this.getTopRanking(50).subscribe({
      next: (top) => this.leaderboardSubject.next(top),
      error: (err) => console.error('Error loading initial leaderboard:', err),
    });
  }

  getPlayerStats(playerName: string): Observable<ILeaderboard | null> {
    return this.http.get<ILeaderboard>(`${this.baseUrl}/ranking/${playerName}`);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
