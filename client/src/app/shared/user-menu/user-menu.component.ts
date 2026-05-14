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
  bones = 0;

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
  unreadCounts: { [friend: string]: number } = {};

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  private authSub?: Subscription;
  private friendsSub?: Subscription;
  private pendingRequestsSub?: Subscription;
  private chatMessagesSub?: Subscription;
  private unreadCountsSub?: Subscription;

  get shouldShow(): boolean {
    return this.isLoggedIn && !this.authService.getCurrentUser()?.guest;
  }

  get activeMessages(): ChatMessage[] {
    if (!this.selectedFriend) return [];
    return this.friendsService.getChatMessagesForFriend(this.selectedFriend);
  }

  get totalUnread(): number {
    try {
      return this.friendsService.getTotalUnreadCount() ?? 0;
    } catch {
      return 0;
    }
  }

  constructor(
    private authService: AuthService,
    private friendsService: FriendsService,
    private router: Router,
    private audio: AudioService,
  ) {}

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe((user) => {
      if (user && !user.guest) {
        this.username = user.username;
        this.isLoggedIn = true;
      } else {
        this.isLoggedIn = false;
        this.clearData();
      }
    });

    this.friendsSub = this.friendsService.friends$.subscribe((friends) => {
      this.friends = friends;
    });

    // Suscribirse a cambios en solicitudes pendientes (recibidas)
    this.pendingRequestsSub = this.friendsService.pendingRequests$.subscribe((requests) => {
      this.pendingRequests = requests;
    });

    this.chatMessagesSub = this.friendsService.chatMessages$.subscribe((messages) => {
      if (this.selectedFriend) {
        // No guardamos localmente, el getter activeMessages usa el estado del servicio.
      }
    });

    this.unreadCountsSub = this.friendsService.unreadCounts$.subscribe((counts) => {
      this.unreadCounts = counts ?? {};
    });
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

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  openChatWith(friend: string) {
    this.selectedFriend = friend;
    this.chatTab = 'chat';

    const cachedMessages = this.friendsService.getChatMessagesForFriend(friend);
    if (!cachedMessages?.length) {
      this.friendsService.loadChatMessages(friend);
    }

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

  openShop() {
    this.router.navigate(['/shop']);
  }

  onAddFriend() {
    this.showAddFriendModal = true;
    this.newFriendName = '';
    this.modalMessage = '';
    this.menuOpen = false;
  }

  async confirmAddFriend() {
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
      this.modalMessage = 'Este usuario ya te envió una solicitud. ¡Acéptala!';
      return;
    }

    const result = await this.friendsService.sendFriendRequestSocket(name);
    if (!result || typeof result !== 'object') {
      this.modalMessage = 'No se obtuvo respuesta del servidor';
      return;
    }
    if (result.success) {
      this.modalMessage = 'Solicitud enviada a ' + name;
      setTimeout(() => this.closeModal(), 1400);
    } else {
      this.modalMessage = result.message || 'Error enviando solicitud';
    }
  }

  closeModal() {
    this.showAddFriendModal = false;
    this.newFriendName = '';
    this.modalMessage = '';
  }

  acceptRequest(request: FriendRequest) {
    this.friendsService.acceptFriendRequestSocket(request._id);
  }

  rejectRequest(request: FriendRequest) {
    this.friendsService.rejectFriendRequestSocket(request._id);
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
    this.bones = 0;
    this.friends = [];
    this.pendingRequests = [];
    this.menuOpen = false;
    this.chatOpen = false;
    this.selectedFriend = null;
    this.unreadCounts = {};
  }
}
