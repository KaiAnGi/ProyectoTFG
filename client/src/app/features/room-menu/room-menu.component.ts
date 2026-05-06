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
  username = 'Usuario';
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
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
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
      this.modalMessage = 'Este usuario ya te envió una solicitud. ¡Acéptala!';
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

  onBack() {
    this.router.navigate(['/']);
  }
}
