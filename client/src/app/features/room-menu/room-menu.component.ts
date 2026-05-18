import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { FriendsService, FriendRequest } from '../../services/friends.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-room-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './room-menu.component.html',
  styleUrl: './room-menu.component.css',
})
export class RoomMenuComponent implements OnInit, OnDestroy {
  username = 'User';
  menuOpen = false;

  friends: string[] = [];
  pendingRequests: FriendRequest[] = [];

  showAddFriendModal = false;
  newFriendName = '';
  modalMessage = '';

  showRemoveConfirm = false;
  friendToRemove = '';

  private friendsSub?: Subscription;
  private pendingRequestsSub?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService,
    private friendsService: FriendsService,
  ) { }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.friendsSub = this.friendsService.friends$.subscribe((friends) => {
      this.friends = friends;
    });
    this.pendingRequestsSub = this.friendsService.pendingRequests$.subscribe((requests) => {
      this.pendingRequests = requests;
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  ngOnDestroy() {
    this.friendsSub?.unsubscribe();
    this.pendingRequestsSub?.unsubscribe();
  }

  // ── AÑADIR AMIGO ──────────────────────────────
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

  // ── SOLICITUDES RECIBIDAS ─────────────────────
  acceptRequest(request: FriendRequest) {
    this.friendsService.acceptFriendRequestSocket(request._id);
  }

  rejectRequest(request: FriendRequest) {
    this.friendsService.rejectFriendRequestSocket(request._id);
  }

  // ── ELIMINAR AMIGO ────────────────────────────
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

  onCreateRoom() {
    this.router.navigate(['/create-room']);
  }

  onJoinRoom() {
    this.router.navigate(['/join-room']);
  }

  onLeaderboard() {
    this.router.navigate(['/leaderboard']);
  }

  onBack() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
