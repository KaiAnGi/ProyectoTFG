import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FriendsService, FriendRequest, ChatMessage } from '../../services/friends.service';
import { Subscription } from 'rxjs';
import { AudioService } from '../../services/audio';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.css',
})
export class UserMenuComponent implements OnInit, OnDestroy {
  username = '';
  menuOpen = false;
  isLoggedIn = false;

  friends: string[] = [];
  pendingRequests: FriendRequest[] = [];

  showAddFriendModal = false;
  newFriendName = '';
  modalMessage = '';

  showRemoveConfirm = false;
  friendToRemove = '';

  chatOpen = false;
  chatTab: 'friends' | 'chat' = 'friends';
  chatInput = '';
  selectedFriend: string | null = null;
  chatMessages: ChatMessage[] = [];
  unreadCounts: { [friend: string]: number } = {};

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private authSub?: Subscription;
  private friendsSub?: Subscription;
  private pendingRequestsSub?: Subscription;
  private chatMessagesSub?: Subscription;
  private unreadCountsSub?: Subscription;

  get shouldShow(): boolean {
    return this.isLoggedIn;
  }

  get activeMessages(): ChatMessage[] {
    if (!this.selectedFriend) return [];
    return this.friendsService.getChatMessagesForFriend(this.selectedFriend);
  }

  get totalUnread(): number {
    return this.friendsService.getTotalUnreadCount();
  }

  constructor(
    private authService: AuthService,
    private friendsService: FriendsService,
    private router: Router,
    private audio: AudioService,
  ) {}

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe((user) => {
      if (user) {
        this.username = user.username;
        this.isLoggedIn = true;
      } else {
        this.isLoggedIn = false;
        this.clearData();
      }
    });

    // Suscribirse a cambios en amigos
    this.friendsSub = this.friendsService.friends$.subscribe((friends) => {
      this.friends = friends;
    });

    // Suscribirse a cambios en solicitudes pendientes
    this.pendingRequestsSub = this.friendsService.pendingRequests$.subscribe((requests) => {
      this.pendingRequests = requests;
    });

    // Suscribirse a cambios en mensajes de chat
    this.chatMessagesSub = this.friendsService.chatMessages$.subscribe((messages) => {
      if (this.selectedFriend) {
        this.chatMessages = messages[this.selectedFriend] || [];
      }
    });

    // Suscribirse a cambios en contadores de no leídos
    this.unreadCountsSub = this.friendsService.unreadCounts$.subscribe((counts) => {
      this.unreadCounts = counts;
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.menuOpen = false;
    }
  }

  toggleChat() {
    this.chatOpen = !this.chatOpen;
    if (this.chatOpen && this.selectedFriend) {
      this.friendsService.markMessagesAsRead(this.selectedFriend);
    }
  }

  openChatWith(friend: string) {
    this.selectedFriend = friend;
    this.chatTab = 'chat';

    // Cargar mensajes si no están cargados
    if (!this.chatMessages.length) {
      this.friendsService.loadChatMessages(friend);
    }

    // Marcar como leídos
    this.friendsService.markMessagesAsRead(friend);
  }

  sendMessage() {
    const text = this.chatInput.trim();
    if (!text || !this.selectedFriend) return;

    this.friendsService.sendChatMessage(this.selectedFriend, text);
    this.chatInput = '';

    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  onAddFriend() {
    this.showAddFriendModal = true;
    this.newFriendName = '';
    this.modalMessage = '';
    this.menuOpen = false;
  }

  confirmAddFriend() {
    const name = this.newFriendName.trim();
    if (!name) {
      this.modalMessage = 'Escribe un nombre de usuario.';
      return;
    }
    if (this.friends.includes(name)) {
      this.modalMessage = 'Ya es tu amigo.';
      return;
    }
    if (this.pendingRequests.some((req) => req.from === name)) {
      this.modalMessage = 'Ya le enviaste una solicitud.';
      return;
    }

    this.friendsService.sendFriendRequestSocket(name);
    this.modalMessage = `Solicitud enviada a ${name} ✔`;
    setTimeout(() => this.closeModal(), 1400);
  }

  closeModal() {
    this.showAddFriendModal = false;
    this.newFriendName = '';
    this.modalMessage = '';
  }

  acceptRequest(requestId: string) {
    this.friendsService.acceptFriendRequestSocket(requestId);
  }

  rejectRequest(requestId: string) {
    this.friendsService.rejectFriendRequestSocket(requestId);
  }

  onRemoveFriend(name: string) {
    this.friendToRemove = name;
    this.showRemoveConfirm = true;
    this.menuOpen = false;
  }

  confirmRemoveFriend() {
    this.friendsService.removeFriendSocket(this.friendToRemove);
    this.friendToRemove = '';
    this.showRemoveConfirm = false;
  }

  cancelRemove() {
    this.friendToRemove = '';
    this.showRemoveConfirm = false;
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.friendsSub?.unsubscribe();
    this.pendingRequestsSub?.unsubscribe();
    this.chatMessagesSub?.unsubscribe();
    this.unreadCountsSub?.unsubscribe();
  }

  private clearData() {
    this.username = '';
    this.friends = [];
    this.pendingRequests = [];
    this.menuOpen = false;
    this.chatOpen = false;
    this.selectedFriend = null;
    this.unreadCounts = {};
  }
}
