import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { SocketService } from './socket.service';
import { AuthService } from './auth';
import { environment } from '../../enviroments/enviroment';

export interface FriendRequest {
  _id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface ChatMessage {
  _id: string;
  from: string;
  to: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class FriendsService {
  private apiUrl = `${environment.apiUrl}/friends`;

  // Subjects para estado reactivo
  private friendsSubject = new BehaviorSubject<string[]>([]);
  private pendingRequestsSubject = new BehaviorSubject<FriendRequest[]>([]);
  public chatMessagesSubject = new BehaviorSubject<{ [friend: string]: ChatMessage[] }>({});
  private unreadCountsSubject = new BehaviorSubject<{ [friend: string]: number }>({});

  // Observables públicos
  friends$ = this.friendsSubject.asObservable();
  pendingRequests$ = this.pendingRequestsSubject.asObservable();
  chatMessages$ = this.chatMessagesSubject.asObservable();
  unreadCounts$ = this.unreadCountsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private socketService: SocketService,
    private authService: AuthService,
  ) {
    this.initializeSocketListeners();
    this.loadInitialData();

    // Conectar socket cuando hay usuario autenticado
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.socketService.connect();
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('rps_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  private initializeSocketListeners() {
    // Escuchar eventos de socket para amigos
    this.socketService.on('friend_request_received').subscribe((data) => {
      this.loadPendingRequests();
    });

    this.socketService.on('friend_request_accepted').subscribe((data) => {
      this.loadFriends();
      this.loadPendingRequests();
    });

    this.socketService.on('friend_request_rejected').subscribe((data) => {
      this.loadPendingRequests();
    });

    this.socketService.on('friend_removed').subscribe((data) => {
      this.loadFriends();
    });

    // Escuchar mensajes de chat
    this.socketService.on('chat_message').subscribe((data) => {
      this.handleIncomingMessage(data);
    });

    this.socketService.on('chat_messages_read').subscribe((data) => {
      this.markMessagesAsReadLocally(data.friendUsername);
    });
  }

  private loadInitialData() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.loadFriends();
        this.loadPendingRequests();
        this.loadUnreadCounts();
      } else {
        this.clearData();
      }
    });
  }

  private clearData() {
    this.friendsSubject.next([]);
    this.pendingRequestsSubject.next([]);
    this.chatMessagesSubject.next({});
    this.unreadCountsSubject.next({});
  }

  // API REST methods
  sendFriendRequest(toUsername: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/request`, { toUsername }, { headers: this.getHeaders() });
  }

  acceptFriendRequest(requestId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/request/${requestId}/accept`,
      {},
      { headers: this.getHeaders() },
    );
  }

  rejectFriendRequest(requestId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/request/${requestId}/reject`,
      {},
      { headers: this.getHeaders() },
    );
  }

  removeFriend(friendUsername: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${friendUsername}`, { headers: this.getHeaders() });
  }

  getFriends(): Observable<any> {
    return this.http.get(`${this.apiUrl}`, { headers: this.getHeaders() });
  }

  getPendingRequests(): Observable<any> {
    return this.http.get(`${this.apiUrl}/requests/pending`, { headers: this.getHeaders() });
  }

  getChatMessages(friendUsername: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat/${friendUsername}`, { headers: this.getHeaders() });
  }

  getUnreadCounts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/chat/unread`, { headers: this.getHeaders() });
  }

  // Métodos de carga de datos
  loadFriends() {
    this.getFriends().subscribe({
      next: (response) => {
        if (response.success) {
          this.friendsSubject.next(response.friends);
        }
      },
      error: (error) => console.error('Error loading friends:', error),
    });
  }

  loadPendingRequests() {
    this.getPendingRequests().subscribe({
      next: (response) => {
        if (response.success) {
          this.pendingRequestsSubject.next(response.requests || []);
        }
      },
      error: (error) => {
        console.error('Error loading pending requests:', error);
        this.pendingRequestsSubject.next([]);
      },
    });
  }

  loadUnreadCounts() {
    this.getUnreadCounts().subscribe({
      next: (response) => {
        if (response.success) {
          this.unreadCountsSubject.next(response.unreadCounts);
        }
      },
      error: (error) => console.error('Error loading unread counts:', error),
    });
  }

  loadChatMessages(friendUsername: string) {
    this.getChatMessages(friendUsername).subscribe({
      next: (response) => {
        if (response.success) {
          const currentMessages = this.chatMessagesSubject.value;
          currentMessages[friendUsername] = response.messages;
          this.chatMessagesSubject.next({ ...currentMessages });
        }
      },
      error: (error) => console.error('Error loading chat messages:', error),
    });
  }

  // Socket methods
  sendFriendRequestSocket(toUsername: string) {
    this.socketService.emit('send_friend_request', { toUsername });
    this.loadPendingRequests();
  }

  acceptFriendRequestSocket(requestId: string) {
    this.socketService.emit('accept_friend_request', { requestId });
  }

  rejectFriendRequestSocket(requestId: string) {
    this.socketService.emit('reject_friend_request', { requestId });
  }

  removeFriendSocket(friendUsername: string) {
    this.socketService.emit('remove_friend', { friendUsername });
  }

  sendChatMessage(to: string, message: string) {
    this.socketService.emit('send_chat_message', { to, message });
  }

  markMessagesAsRead(friendUsername: string) {
    this.socketService.emit('mark_chat_messages_read', { friendUsername });
  }

  // Métodos de manejo de mensajes
  private handleIncomingMessage(data: any) {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const currentUsername = currentUser.username;
    const isFromCurrentUser = data.from === currentUsername;
    const friendUsername = isFromCurrentUser ? data.to : data.from;

    if (!this.chatMessagesSubject.value[friendUsername]) {
      this.chatMessagesSubject.value[friendUsername] = [];
    }

    this.chatMessagesSubject.value[friendUsername].push(data);
    this.chatMessagesSubject.next({ ...this.chatMessagesSubject.value });

    // Actualizar contador de no leídos si el mensaje NO es del usuario actual
    if (!isFromCurrentUser) {
      const currentUnread = this.unreadCountsSubject.value;
      currentUnread[friendUsername] = (currentUnread[friendUsername] || 0) + 1;
      this.unreadCountsSubject.next({ ...currentUnread });
    }
  }

  private markMessagesAsReadLocally(friendUsername: string) {
    const currentUnread = this.unreadCountsSubject.value;
    currentUnread[friendUsername] = 0;
    this.unreadCountsSubject.next({ ...currentUnread });
  }

  // Getters para datos actuales
  getCurrentFriends(): string[] {
    return this.friendsSubject.value;
  }

  getCurrentPendingRequests(): FriendRequest[] {
    return this.pendingRequestsSubject.value;
  }

  getChatMessagesForFriend(friendUsername: string): ChatMessage[] {
    return this.chatMessagesSubject.value[friendUsername] || [];
  }

  getUnreadCountForFriend(friendUsername: string): number {
    return this.unreadCountsSubject.value[friendUsername] || 0;
  }

  getTotalUnreadCount(): number {
    return Object.values(this.unreadCountsSubject.value).reduce((a, b) => a + b, 0);
  }
}
