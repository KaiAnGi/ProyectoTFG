import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-room-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './room-menu.component.html',
  styleUrl: './room-menu.component.css'
})
export class RoomMenuComponent implements OnInit {
  username = 'Usuario';
  menuOpen = false;

  friends: string[] = [];
  pendingRequests: string[] = [];

  showAddFriendModal = false;
  newFriendName = '';
  modalMessage = '';

  showRemoveConfirm = false;
  friendToRemove = '';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) this.username = user.username;

    // TODO: reemplazar con llamadas a API cuando Diego tenga los endpoints
    const savedFriends = localStorage.getItem('rps_friends');
    if (savedFriends) this.friends = JSON.parse(savedFriends);

    const savedRequests = localStorage.getItem('rps_requests');
    if (savedRequests) this.pendingRequests = JSON.parse(savedRequests);
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
    if (this.pendingRequests.includes(name)) {
      this.modalMessage = 'Ya le enviaste una solicitud.';
      return;
    }

    // TODO: sustituir por → this.friendsService.sendRequest(name)
    // Mock: simula que el otro usuario recibe la solicitud
    const theirRequests: string[] = JSON.parse(
      localStorage.getItem(`rps_requests_${name}`) || '[]'
    );
    theirRequests.push(this.username);
    localStorage.setItem(`rps_requests_${name}`, JSON.stringify(theirRequests));

    this.modalMessage = `Solicitud enviada a ${name} ✔`;
    setTimeout(() => this.closeModal(), 1400);
  }

  closeModal() {
    this.showAddFriendModal = false;
    this.newFriendName = '';
    this.modalMessage = '';
  }

  // ── SOLICITUDES RECIBIDAS ─────────────────────
  acceptRequest(name: string) {
    // TODO: sustituir por → this.friendsService.acceptRequest(name)
    this.friends.push(name);
    this.pendingRequests = this.pendingRequests.filter(r => r !== name);
    localStorage.setItem('rps_friends', JSON.stringify(this.friends));
    localStorage.setItem('rps_requests', JSON.stringify(this.pendingRequests));
  }

  rejectRequest(name: string) {
    // TODO: sustituir por → this.friendsService.rejectRequest(name)
    this.pendingRequests = this.pendingRequests.filter(r => r !== name);
    localStorage.setItem('rps_requests', JSON.stringify(this.pendingRequests));
  }

  // ── ELIMINAR AMIGO ────────────────────────────
  onRemoveFriend(name: string) {
    this.friendToRemove = name;
    this.showRemoveConfirm = true;
    this.menuOpen = false;
  }

  confirmRemoveFriend() {
    // TODO: sustituir por → this.friendsService.removeFriend(this.friendToRemove)
    this.friends = this.friends.filter(f => f !== this.friendToRemove);
    localStorage.setItem('rps_friends', JSON.stringify(this.friends));
    this.friendToRemove = '';
    this.showRemoveConfirm = false;
  }

  cancelRemove() {
    this.friendToRemove = '';
    this.showRemoveConfirm = false;
  }

  onCreateRoom() { this.router.navigate(['/create-room']); }
  onJoinRoom()   { this.router.navigate(['/join-room']); }
  onBack()       { this.router.navigate(['/']); }
}