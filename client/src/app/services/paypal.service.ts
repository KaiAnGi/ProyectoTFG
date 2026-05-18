import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { environment } from "../../enviroments/enviroment";
import { AuthService } from "./auth";

@Injectable({ providedIn: "root" })
export class PaypalService {
  private api = `${environment.apiUrl}/paypal`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  createOrder(packId: string) {
    return firstValueFrom(
      this.http.post<{ success: boolean; orderID: string }>(
        `${this.api}/create-order`,
        { packId },
        { headers: this.getHeaders() }
      )
    );
  }

  captureOrder(orderID: string, packId: string) {
    return firstValueFrom(
      this.http.post<{ success: boolean; shinesAdded: number; bones: number }>(
        `${this.api}/capture-order`,
        { orderID, packId },
        { headers: this.getHeaders() }
      )
    );
  }

  checkOrder(orderID: string) {
    return firstValueFrom(
      this.http.get<{ success: boolean; approved: boolean }>(
        `${this.api}/check-order/${orderID}`,
        { headers: this.getHeaders() }
      )
    );
  }

  requestRefund(amount: number | "all", paypalEmail: string) {
    return firstValueFrom(
      this.http.post<{ success: boolean; refundedShines: number; refundedEur: number; bones: number }>(
        `${this.api}/refund`,
        { amount, paypalEmail },
        { headers: this.getHeaders() }
      )
    );
  }
}