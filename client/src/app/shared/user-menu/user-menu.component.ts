import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FriendsService, FriendRequest, ChatMessage } from '../../services/friends.service';
import { PaypalService } from '../../services/paypal.service';
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

  refundOpen = false;
  refundAmounts = [100, 200, 500, 1000];
  selectedRefundAmount: number | 'all' | null = null;
  refundEmail = '';
  refunding = false;
  refundMessage = '';
  refundError = '';

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
    private paypalService: PaypalService,
    private router: Router,
    private audio: AudioService,
  ) {}

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe((user) => {
      if (user && !user.guest) {
        this.username = user.username;
        this.isLoggedIn = true;
        this.bones = user.bones ?? 0;
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

  toggleRefund() {
    this.refundOpen = !this.refundOpen;
    if (!this.refundOpen) {
      this.selectedRefundAmount = null;
      this.refundEmail = '';
      this.refundMessage = '';
      this.refundError = '';
    }
  }

  selectRefundAmount(amount: number | 'all') {
    this.selectedRefundAmount = amount;
    this.refundMessage = '';
    this.refundError = '';
  }

  async onRefund() {
    if (!this.selectedRefundAmount) {
      this.refundError = 'Selecciona una cantidad de shines a reembolsar.';
      return;
    }
    const email = this.refundEmail.trim();
    if (!email) {
      this.refundError = 'Introduce tu email de PayPal.';
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.refundError = 'Email de PayPal inválido.';
      return;
    }

    this.refunding = true;
    this.refundMessage = '';
    this.refundError = '';

    try {
      const result = await this.paypalService.requestRefund(this.selectedRefundAmount, email);
      if (result.success) {
        this.authService.updateBones(result.bones);
        this.refundMessage = `Reembolso de ${result.refundedShines} shines (${result.refundedEur.toFixed(2)}€) procesado con éxito.`;
        this.selectedRefundAmount = null;
        this.refundEmail = '';
      } else {
        this.refundError = 'El reembolso no se pudo procesar.';
      }
    } catch (err: any) {
      this.refundError = err.error?.message || 'Error al procesar el reembolso.';
    } finally {
      this.refunding = false;
    }
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
      this.modalMessage = 'Enter a username.';
      return;
    }
    if (this.friends.includes(name)) {
      this.modalMessage = 'This user is already your friend.';
      return;
    }
    if (this.pendingRequests.some((req) => req.from === name)) {
      this.modalMessage = 'This user already sent you a request. Accept it!';
      return;
    }

    const result = await this.friendsService.sendFriendRequestSocket(name);
    if (!result || typeof result !== 'object') {
      this.modalMessage = 'No response from server';
      return;
    }
    if (result.success) {
      this.modalMessage = 'Request sent to ' + name;
      setTimeout(() => this.closeModal(), 1400);
    } else {
      this.modalMessage = result.message || 'Error sending request';
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
