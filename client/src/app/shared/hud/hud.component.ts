import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AudioService } from '../../services/audio';
import { PaypalService } from '../../services/paypal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hud',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hud.component.html',
  styleUrl: './hud.component.css'
})
export class HudComponent implements OnInit, OnDestroy {
  @Input() showUserDetails = false;
  @Input() isGameRoute = false;
  bones = 50;
  muted = false;
  sliderOpen = false;
  volume = 0.2;
  shopOpen = false;
  selectedItem: number | null = null;

  paying = false;
  payMessage = '';
  payError = '';

  shopItems = [
    { id: 'pack100', img: '/images/3huesos.png', label: '+100 Shines', price: '4,65€' },
    { id: 'pack500', img: '/images/5huesos.png', label: '+500 Shines', price: '8,70€' },
    { id: 'pack1000', img: '/images/bulto.png', label: '+1000 Shines', price: '15,78€' },
  ];

  private authSub?: Subscription;

  constructor(
    private authService: AuthService,
    private audioService: AudioService,
    private router: Router,
    private paypalService: PaypalService
  ) { }

  ngOnInit() {
    this.authSub = this.authService.user$.subscribe(user => {
      this.bones = user?.bones ?? 0;
    });

    this.audioService.playMusic('/sounds/musicaFondo.mp3', this.volume);
  }

  onMuteBtnClick() {
    if (this.muted) {
      this.muted = this.audioService.toggleMute();
      this.sliderOpen = true;
    } else {
      this.muted = this.audioService.toggleMute(); 
      this.sliderOpen = false;
    }
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.volume = parseFloat(input.value);
    this.audioService.setVolume(this.volume);
    this.muted = this.volume === 0;
  }

  toggleShop() {
    this.shopOpen = !this.shopOpen;
    if (!this.shopOpen) {
      this.selectedItem = null;
      this.payMessage = '';
      this.payError = '';
    }
  }

  selectItem(index: number) {
    this.selectedItem = index;
    this.payMessage = '';
    this.payError = '';
  }

  async onPay() {
    if (this.selectedItem === null) {
      this.payError = 'Selecciona un pack primero.';
      return;
    }

    const pack = this.shopItems[this.selectedItem];
    const currentUser = this.authService.getCurrentUser();
    const useSavedVault = !!currentUser?.paypalVaultId;
    this.paying = true;
    this.payMessage = '';
    this.payError = '';

    try {
      const { orderID } = await this.paypalService.createOrder(pack.id);
      if (!useSavedVault) {
        const approved = await this.openPaypalWindow(orderID);

        if (!approved) {
          this.payError = 'Pago cancelado.';
          return;
        }
      }

      const result = await this.paypalService.captureOrder(orderID, pack.id);

      if (!result || typeof result !== 'object') {
        this.payError = 'Respuesta inválida del servidor al capturar pago.';
        return;
      }

      if (result.success) {
        this.bones = result.bones;
        this.payMessage = '+' + result.shinesAdded + ' Shines añadidos!';
      } else {
        this.payError = 'El pago no se pudo completar.';
      }

    } catch (err) {
      console.error('Error en el pago:', err);
      this.payError = 'Error al procesar el pago.';
    } finally {
      this.paying = false;
    }
  }

  private openPaypalWindow(orderID: string): Promise<boolean> {
    return new Promise((resolve) => {
      const url = `https://www.sandbox.paypal.com/checkoutnow?token=${orderID}`;
      const popup = window.open(url, 'paypal_checkout', 'width=500,height=700,scrollbars=yes');

      if (!popup) {
        this.payError = 'Activa los popups para poder pagar.';
        resolve(false);
        return;
      }

      let resolved = false;

      const finish = (approved: boolean) => {
        if (resolved) return;
        resolved = true;
        clearInterval(interval);
        if (!popup.closed) popup.close();
        resolve(approved);
      };

      const interval = setInterval(async () => {
        if (popup.closed) {
          if (resolved) return;
          resolved = true;
          clearInterval(interval);
          try {
            const check = await this.paypalService.checkOrder(orderID);
            resolve(check.approved);
          } catch {
            resolve(false);
          }
          return;
        }

        try {
          const check = await this.paypalService.checkOrder(orderID);
          if (check.approved) {
            finish(true);
          }
        } catch {
          // sigue esperando
        }
      }, 2000);

      setTimeout(() => finish(false), 5 * 60 * 1000);
    });
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}