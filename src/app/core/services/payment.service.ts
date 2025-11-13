// src/app/core/services/payment.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '@env/environment';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  paymentMethod: 'qr_code' | 'upi' | 'card' | 'net_banking';
  qrCodeUrl?: string;
  upiId?: string;
  paymentId?: string; // Razorpay/external payment ID
  transactionId?: string; // Bank transaction ID
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
  cardNumber?: string; // Last 4 digits only
  expiryDate?: string;
  refundId?: string;
  refundReason?: string;
  refundAmount?: number;
}

export interface PaymentStats {
  totalRevenue: number;
  pendingApprovals: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalTransactions?: number;
  averageTransactionValue?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiBaseUrl}/payments`;
  private paymentsSubject = new BehaviorSubject<Payment[]>([]);
  public payments$ = this.paymentsSubject.asObservable();

  private statsSubject = new BehaviorSubject<PaymentStats | null>(null);
  public stats$ = this.statsSubject.asObservable();

  private paymentStatusSubject = new BehaviorSubject<Payment | null>(null);
  public paymentStatus$ = this.paymentStatusSubject.asObservable();

  private readonly UPI_ID = 'restaurant@paytm';
  private readonly UPI_NAME = 'TasteTown Restaurant';

  constructor(private http: HttpClient) {
    this.loadPayments();
  }

  /**
   * ============================================
   * ADMIN PAYMENT APPROVAL WORKFLOW (Existing)
   * ============================================
   */

  /**
   * Create payment (admin workflow - awaiting approval)
   */
  createPayment(
    orderId: string,
    amount: number,
    customerName: string,
    customerPhone: string,
    customerEmail: string
  ): Observable<Payment> {
    const qrCodeUrl = this.generateQRCode(amount);

    const payment: any = {
      orderId,
      amount,
      status: 'pending',
      paymentMethod: 'qr_code',
      qrCodeUrl,
      upiId: this.UPI_ID,
      customerName,
      customerPhone,
      customerEmail,
      createdAt: new Date(),
      notes: 'Awaiting admin approval'
    };

    return this.http.post<Payment>(this.apiUrl, payment).pipe(
      tap((newPayment) => {
        const current = this.paymentsSubject.value;
        this.paymentsSubject.next([...current, newPayment]);
        this.calculateStats();
        console.log('✓ Payment created:', newPayment.id);
      }),
      catchError((err) => {
        console.error('❌ Failed to create payment', err);
        return of(null as any);
      })
    );
  }

  /**
   * Get all payments
   */
  getPayments(): Observable<Payment[]> {
    return this.payments$;
  }

  /**
   * Load payments from backend
   */
  loadPayments(): void {
    this.http
      .get<Payment[]>(this.apiUrl)
      .pipe(
        tap((payments) => {
          this.paymentsSubject.next(payments);
          this.calculateStats();
        }),
        catchError((err) => {
          console.error('❌ Failed to load payments', err);
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Approve payment (admin action)
   */
  approvePayment(paymentId: string, approvedBy: string): Observable<Payment> {
    const updateData = {
      status: 'success',
      approvedBy,
      approvedAt: new Date()
    };

    return this.http
      .patch<Payment>(`${this.apiUrl}/${paymentId}`, updateData)
      .pipe(
        tap((updatedPayment) => {
          const payments = this.paymentsSubject.value;
          const index = payments.findIndex((p) => p.id === paymentId);
          if (index > -1) {
            payments[index] = updatedPayment;
            this.paymentsSubject.next([...payments]);
            this.calculateStats();
            console.log('✓ Payment approved:', paymentId);
          }
        }),
        catchError((err) => {
          console.error('❌ Failed to approve payment', err);
          return of(null as any);
        })
      );
  }

  /**
   * Reject/Refund payment (admin action)
   */
  rejectPayment(paymentId: string, reason: string): Observable<Payment> {
    const updateData = {
      status: 'failed',
      notes: reason
    };

    return this.http
      .patch<Payment>(`${this.apiUrl}/${paymentId}`, updateData)
      .pipe(
        tap((updatedPayment) => {
          const payments = this.paymentsSubject.value;
          const index = payments.findIndex((p) => p.id === paymentId);
          if (index > -1) {
            payments[index] = updatedPayment;
            this.paymentsSubject.next([...payments]);
            this.calculateStats();
            console.log('✓ Payment rejected:', paymentId);
          }
        }),
        catchError((err) => {
          console.error('❌ Failed to reject payment', err);
          return of(null as any);
        })
      );
  }

  /**
   * Get pending payments for admin approval
   */
  getPendingPayments(): Observable<Payment[]> {
    return this.http
      .get<Payment[]>(`${this.apiUrl}?status=pending`)
      .pipe(
        catchError((err) => {
          console.error('❌ Failed to fetch pending payments', err);
          return of([]);
        })
      );
  }

  /**
   * ============================================
   * CUSTOMER PAYMENT PROCESSING (New)
   * ============================================
   */

  /**
   * Process UPI payment (customer)
   */
  processUPIPayment(paymentData: any): Observable<any> {
    const payload = {
      ...paymentData,
      status: 'pending',
      paymentMethod: 'upi',
      createdAt: new Date()
    };

    return this.http.post<any>(`${this.apiUrl}/process-upi`, payload).pipe(
      tap((response) => {
        console.log('✓ UPI payment processed:', response);
        this.paymentStatusSubject.next(response);
        // Reload payments to update list
        this.loadPayments();
      }),
      catchError((err) => {
        console.error('❌ UPI payment error:', err);
        throw err;
      })
    );
  }

  /**
   * Verify UPI payment status (customer)
   */
  verifyUPIPayment(verificationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, verificationData).pipe(
      tap((response) => {
        console.log('✓ UPI payment verified:', response);
        this.paymentStatusSubject.next(response);
        if (response.status === 'success') {
          this.loadPayments();
        }
      }),
      catchError((err) => {
        console.error('❌ UPI verification error:', err);
        throw err;
      })
    );
  }

  /**
   * Process card payment through Razorpay (customer)
   */
  processCardPayment(paymentData: any): Observable<any> {
    const payload = {
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      paymentMethod: 'card',
      customerName: paymentData.customerName,
      customerEmail: paymentData.customerEmail,
      customerPhone: paymentData.customerPhone,
      status: 'pending'
    };

    return this.http.post<any>(`${this.apiUrl}/process-card`, payload).pipe(
      tap((response) => {
        console.log('✓ Card payment processed:', response);
        this.paymentStatusSubject.next(response);
      }),
      catchError((err) => {
        console.error('❌ Card payment error:', err);
        throw err;
      })
    );
  }

  /**
   * Verify Razorpay payment signature (customer)
   */
  verifyPaymentSignature(signatureData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-signature`, signatureData).pipe(
      tap((response) => {
        console.log('✓ Razorpay signature verified:', response);
        this.paymentStatusSubject.next(response);
        if (response.status === 'success') {
          this.loadPayments();
        }
      }),
      catchError((err) => {
        console.error('❌ Signature verification error:', err);
        throw err;
      })
    );
  }

  /**
   * Get payment by ID
   */
  getPaymentById(paymentId: string): Observable<Payment> {
    return this.http.get<Payment>(`${this.apiUrl}/${paymentId}`).pipe(
      tap((payment) => {
        console.log('✓ Payment retrieved:', paymentId);
        this.paymentStatusSubject.next(payment);
      }),
      catchError((err) => {
        console.error('❌ Failed to fetch payment:', err);
        throw err;
      })
    );
  }

  /**
   * Get payment status by order ID
   */
  getPaymentByOrderId(orderId: string): Observable<Payment | null> {
    return this.http.get<Payment[]>(`${this.apiUrl}?orderId=${orderId}`).pipe(
      map((payments) => payments.length ? payments[0] : null),
      catchError((err) => {
        console.error('❌ Failed to fetch payment for order:', err);
        return of(null);
      })
    );
  }

  /**
   * Initiate refund
   */
  refundPayment(paymentId: string, reason?: string): Observable<any> {
    const payload = {
      reason: reason || 'Customer requested refund',
      refundDate: new Date()
    };

    return this.http.post<any>(`${this.apiUrl}/${paymentId}/refund`, payload).pipe(
      tap((response) => {
        console.log('✓ Refund initiated:', paymentId);
        this.loadPayments();
      }),
      catchError((err) => {
        console.error('❌ Refund error:', err);
        throw err;
      })
    );
  }

  /**
   * Cancel payment
   */
  cancelPayment(paymentId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${paymentId}/cancel`, {}).pipe(
      tap((response) => {
        console.log('✓ Payment cancelled:', paymentId);
        this.loadPayments();
      }),
      catchError((err) => {
        console.error('❌ Payment cancellation error:', err);
        throw err;
      })
    );
  }

  /**
   * Get payment history for customer
   */
  getPaymentHistory(customerId: string): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.apiUrl}?customerId=${customerId}`).pipe(
      catchError((err) => {
        console.error('❌ Failed to fetch payment history:', err);
        return of([]);
      })
    );
  }

  /**
   * ============================================
   * UTILITY METHODS
   * ============================================
   */

  /**
   * Generate UPI QR Code
   */
  private generateQRCode(amount: number): string {
    const upiString = `upi://pay?pa=${this.UPI_ID}&pn=${this.UPI_NAME}&am=${amount}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      upiString
    )}`;
  }

  /**
   * Generate UPI deep link for mobile
   */
  generateUPIDeepLink(amount: number): string {
    return `upi://pay?pa=${this.UPI_ID}&pn=${this.UPI_NAME}&am=${amount}`;
  }

  /**
   * Calculate payment stats
   */
  private calculateStats(): void {
    const payments = this.paymentsSubject.value;

    const successPayments = payments.filter((p) => p.status === 'success');
    const totalRevenue = successPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTransactions = payments.length;
    const averageValue = totalTransactions > 0 ? totalRevenue / successPayments.length : 0;

    const stats: PaymentStats = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingApprovals: payments.filter((p) => p.status === 'pending').length,
      successfulTransactions: successPayments.length,
      failedTransactions: payments.filter((p) => p.status === 'failed').length,
      totalTransactions,
      averageTransactionValue: Math.round(averageValue * 100) / 100
    };

    this.statsSubject.next(stats);
    console.log('📊 Payment stats updated:', stats);
  }

  /**
   * Get current payment status
   */
  getCurrentPaymentStatus(): Payment | null {
    return this.paymentStatusSubject.value;
  }

  /**
   * Update payment status locally
   */
  updatePaymentStatus(payment: Payment): void {
    this.paymentStatusSubject.next(payment);
    console.log('📝 Payment status updated:', payment.id);
  }

  /**
   * Format card number (show last 4 digits only)
   */
  formatCardNumber(cardNumber: string): string {
    const last4 = cardNumber.slice(-4);
    return `****-****-****-${last4}`;
  }

  /**
   * Validate card details
   */
  validateCardDetails(cardNumber: string, expiryDate: string, cvv: string): boolean {
    // Card number: 16 digits
    const cardRegex = /^\d{16}$/;
    // Expiry: MM/YY
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    // CVV: 3-4 digits
    const cvvRegex = /^\d{3,4}$/;

    return cardRegex.test(cardNumber) && expiryRegex.test(expiryDate) && cvvRegex.test(cvv);
  }

  /**
   * Validate UPI ID format
   */
  validateUpiId(upiId: string): boolean {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]+$/;
    return upiRegex.test(upiId);
  }

  /**
   * Get payment methods available
   */
  getAvailablePaymentMethods(): string[] {
    return ['qr_code', 'upi', 'card', 'net_banking'];
  }

  /**
   * Get UPI ID
   */
  getUpiId(): string {
    return this.UPI_ID;
  }

  /**
   * Get UPI Name
   */
  getUpiName(): string {
    return this.UPI_NAME;
  }
}
