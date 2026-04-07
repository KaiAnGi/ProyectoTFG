import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  nombre = '';
  correo = '';
  password = '';
  confirmPassword = '';
  passwordError = false;
  registerError = '';
  isLoading = false;

  constructor(private router: Router, private auth: AuthService) {}

  onRegister() {
    if (this.password !== this.confirmPassword) {
      this.passwordError = true;
      return;
    }
    this.passwordError = false;
    this.registerError = '';
    this.isLoading = true;

    this.auth
      .register({
        username: this.nombre,
        email: this.correo,
        password: this.password,
        confirmPassword: this.confirmPassword,
      })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          if (!response.success) {
            this.registerError = response.error || 'No se pudo registrar el usuario';
            return;
          }

          this.auth
            .login({ email: this.correo, password: this.password })
            .subscribe({
              next: (loginResponse) => {
                if (!loginResponse.success) {
                  this.registerError =
                    loginResponse.error || 'Usuario creado, pero fallo el inicio de sesion';
                  return;
                }
                this.auth.handleAuthSuccess(loginResponse);
                this.router.navigate(['/room-menu']);
              },
              error: () => {
                this.registerError = 'Usuario creado, pero fallo la conexion para iniciar sesion';
              },
            });
        },
        error: (err) => {
          this.isLoading = false;
          this.registerError = err?.error?.error || 'No se pudo conectar con el servidor';
        },
      });
  }

  goBack() {
    this.router.navigate(['/auth']);
  }
}
