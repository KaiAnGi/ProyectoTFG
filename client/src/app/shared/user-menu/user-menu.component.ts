import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';
import { AudioService } from '../../services/audio';

@Component({
    selector: 'app-user-menu',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './user-menu.component.html',
    styleUrl: './user-menu.component.css'
})
export class UserMenuComponent implements OnInit, OnDestroy {
    username = '';
    menuOpen = false;
    isLoggedIn = false;

    friends: string[] = [];
    pendingRequests: string[] = [];

    showAddFriendModal = false;
    newFriendName = '';
    modalMessage = '';

    showRemoveConfirm = false;
    friendToRemove = '';

    chatOpen = false;
    chatTab: 'friends' | 'chat' = 'friends';
    chatInput = '';
    selectedFriend: string | null = null;
    chatMessages: { sender: string; to: string; text: string }[] = [];
    unreadCounts: { [friend: string]: number } = {};

    @ViewChild('messagesContainer') messagesContainer!: ElementRef;

    private authSub?: Subscription;

    constructor(private authService: AuthService, private router: Router, private audio: AudioService) { }

    ngOnInit() {
        this.authSub = this.authService.user$.subscribe(user => {
            if (user) {
                this.username = user.username;
                this.isLoggedIn = true;
            } else {
                this.isLoggedIn = false;
                this.username = '';
                this.friends = [];
                this.pendingRequests = [];
                this.menuOpen = false;
                this.chatOpen = false;
                this.selectedFriend = null;
                this.unreadCounts = {};
            }
        });
    }

    get shouldShow(): boolean {
        const hiddenRoutes = ['/login', '/register', '/', '/auth'];
        return this.isLoggedIn && !hiddenRoutes.includes(this.router.url);
    }

    get activeMessages() {
        if (!this.selectedFriend) return [];
        return this.chatMessages.filter(
            m => (m.sender === this.selectedFriend && m.to === this.username) ||
                (m.sender === this.username && m.to === this.selectedFriend)
        );
    }

    get totalUnread(): number {
        return Object.values(this.unreadCounts).reduce((a, b) => a + b, 0);
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
            this.unreadCounts[this.selectedFriend] = 0;
        }
    }

    openChatWith(friend: string) {
        this.selectedFriend = friend;
        this.chatTab = 'chat';
        this.unreadCounts[friend] = 0;
    }

    sendMessage() {
        const text = this.chatInput.trim();
        if (!text || !this.selectedFriend) return;
        this.chatMessages.push({ sender: this.username, to: this.selectedFriend, text });
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
        // TODO: conectar con backend/socket
    }

    closeModal() {
        this.showAddFriendModal = false;
        this.newFriendName = '';
        this.modalMessage = '';
    }

    acceptRequest(name: string) {
        // TODO: conectar con backend/socket
    }

    rejectRequest(name: string) {
        // TODO: conectar con backend/socket
    }

    onRemoveFriend(name: string) {
        this.friendToRemove = name;
        this.showRemoveConfirm = true;
        this.menuOpen = false;
    }

    confirmRemoveFriend() {
        // TODO: conectar con backend/socket
    }

    cancelRemove() {
        this.friendToRemove = '';
        this.showRemoveConfirm = false;
    }

    ngOnDestroy() {
        this.authSub?.unsubscribe();
    }
}