import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  correo = '';
  password = '';
  loginError = false;
  errorMessage = '';
  isLoading = false;

  constructor(private router: Router, private auth: AuthService) {}

  onLogin() {
    this.loginError = false;
    this.errorMessage = '';
    this.isLoading = true;

    this.auth.login({ email: this.correo, password: this.password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (!response.success) {
          this.loginError = true;
          this.errorMessage = response.error || 'Correo o contraseña incorrectos';
          return;
        }
        this.auth.handleAuthSuccess(response);
        this.router.navigate(['/room-menu']);
      },
      error: (err) => {
        this.isLoading = false;
        this.loginError = true;
        this.errorMessage = err?.error?.error || 'No se pudo conectar con el servidor';
      },
    });
  }

  goBack() {
    this.router.navigate(['/auth']);
  }
}
