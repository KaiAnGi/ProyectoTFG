import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class AuthComponent {
  constructor(private router: Router, private auth: AuthService) {}

  ngOnInit() {
    this.auth.logout();
  }

  onLogin() {
    this.router.navigate(['/login']);
  }

  onRegister() {
    this.router.navigate(['/register']);
  }

  backHome() {
    this.router.navigate(['/']);
  }
}
