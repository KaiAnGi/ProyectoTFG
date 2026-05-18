import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent {
    isLoggedIn = signal(false);
    currentUser = signal<User | null>(null);
    showAuth = signal(false);
    authMode = signal<'login' | 'register'>('login');

    constructor(private auth: AuthService, private router: Router) {
        effect(() => {
            this.currentUser.set(this.auth.getCurrentUser());
            this.isLoggedIn.set(!!this.auth.getCurrentUser());
        });
    }

    ngOnInit() {
        this.auth.logout();
    }

    onStart() {
        this.router.navigate(['/auth']);
    }


    openAuth(mode: 'login' | 'register') {
        this.authMode.set(mode);
        this.showAuth.set(true);
    }

    closeAuth() {
        this.showAuth.set(false);
    }
}
