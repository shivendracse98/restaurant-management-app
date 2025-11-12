import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

import { Observable } from 'rxjs';
import type { Payment } from '../../models/payment.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // create payment record (status: PENDING)
  createPayment(payload: Partial<Payment>): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/payments`, payload);
  }

  listPayments() {
    return this.http.get<Payment[]>(`${this.base}/payments`);
  }

  updatePaymentStatus(id: number, status: string) {
    return this.http.patch<Payment>(`${this.base}/payments/${id}`, { status });
  }

  getConfig() {
    return this.http.get<{ upiQrUrl?: string; upiId?: string }>(`${this.base}/payments/config`);
  }
}
