import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {
    private router = inject(Router);

    onStart() {
        console.log('¡Botón START clickeado!');
        this.router.navigate(['/room-menu']);
    }
}
