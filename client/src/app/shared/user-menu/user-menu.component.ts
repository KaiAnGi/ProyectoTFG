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

                const savedFriends = localStorage.getItem('rps_friends');
                if (savedFriends) this.friends = JSON.parse(savedFriends);

                const savedRequests = localStorage.getItem(`rps_requests_${this.username}`);
                if (savedRequests) this.pendingRequests = JSON.parse(savedRequests);
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

    receiveMessage(sender: string, text: string) {
        this.chatMessages.push({ sender, to: this.username, text });
        const isViewingChat = this.chatOpen && this.chatTab === 'chat' && this.selectedFriend === sender;
        if (!isViewingChat) {
            this.unreadCounts[sender] = (this.unreadCounts[sender] || 0) + 1;
            this.audio.play('mensaje', 0.5);
        }
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
        const name = this.newFriendName.trim();
        if (!name) {
            this.modalMessage = 'Escribe un nombre de usuario.';
            return;
        }
        if (this.friends.includes(name)) {
            this.modalMessage = 'Ya es tu amigo.';
            return;
        }
        if (name === this.username) {
            this.modalMessage = 'No puedes añadirte a ti mismo.';
            return;
        }

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

    acceptRequest(name: string) {
        this.friends.push(name);
        this.pendingRequests = this.pendingRequests.filter(r => r !== name);
        localStorage.setItem('rps_friends', JSON.stringify(this.friends));
        localStorage.setItem(`rps_requests_${this.username}`, JSON.stringify(this.pendingRequests));
    }

    rejectRequest(name: string) {
        this.pendingRequests = this.pendingRequests.filter(r => r !== name);
        localStorage.setItem(`rps_requests_${this.username}`, JSON.stringify(this.pendingRequests));
    }

    onRemoveFriend(name: string) {
        this.friendToRemove = name;
        this.showRemoveConfirm = true;
        this.menuOpen = false;
    }

    confirmRemoveFriend() {
        this.friends = this.friends.filter(f => f !== this.friendToRemove);
        localStorage.setItem('rps_friends', JSON.stringify(this.friends));
        this.friendToRemove = '';
        this.showRemoveConfirm = false;
    }

    cancelRemove() {
        this.friendToRemove = '';
        this.showRemoveConfirm = false;
    }

    ngOnDestroy() {
        this.authSub?.unsubscribe();
    }
}