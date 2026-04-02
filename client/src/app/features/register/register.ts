import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  onRegister() {
    if (this.password !== this.confirmPassword) {
      this.passwordError = true;
      return;
    }
    this.passwordError = false;

    // Por ahora se guarda en localStorage
    // Kai conectará esto al backend
    const user = {
      nombre: this.nombre,
      correo: this.correo,
      cuentaCreada: new Date().toISOString(),
      cuentaModificada: new Date().toISOString(),
      perfil: 'default'
    };
    localStorage.setItem('rps_user', JSON.stringify(user));
    this.router.navigate(['/room-menu']);
  }

  goBack() {
    this.router.navigate(['/auth']);
  }
}
