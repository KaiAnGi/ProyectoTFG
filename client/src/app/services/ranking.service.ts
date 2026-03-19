// services/ranking.service.ts
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

  readonly baseUrl = environment.apiUrl; // Tipo-safe, no expuesto
  readonly leaderboard$ = this.leaderboardSubject.asObservable();

  constructor() {
    // effect() se ejecuta cuando el servicio se monta (primera inyección)
    effect(() => {
      this.connectSocket();
    });
  }

  private connectSocket() {
    this.socket = io(this.baseUrl);
    this.socket.on('leaderboard:update', (data: ILeaderboard[]) => {
      this.leaderboardSubject.next(data);
    });
  }

  getTopRanking(limit: number = 50): Observable<ILeaderboard[]> {
    return this.http.get<ILeaderboard[]>(`${this.baseUrl}/ranking?limit=${limit}`);
  }

  loadInitial() {
    this.getTopRanking(50).subscribe((top) => {
      this.leaderboardSubject.next(top);
    });
  }

  getPlayerStats(playerName: string): Observable<ILeaderboard | null> {
    return this.http.get<ILeaderboard>(`${this.baseUrl}/ranking/${playerName}`);
  }

  disconnect() {
    this.socket?.disconnect();
  }
}
