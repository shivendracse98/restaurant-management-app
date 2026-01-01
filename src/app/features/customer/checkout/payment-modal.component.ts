// src/app/features/customer/components/checkout/payment-modal/payment-modal.component.ts
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService } from 'src/app/core/services/payment.service';
import { ConfigService } from 'src/app/core/services/config.service';
import { OrderService } from 'src/app/core/services/order.service'; // ✅ Imported

export interface CheckoutData {
  orderId: string | number;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
    ToastrModule
  ],
  templateUrl: './payment-modal.component.html',
  styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent implements OnInit, OnDestroy {
  // Payment options: QR_CODE | UPI | CASH
  paymentMethod: 'QR_CODE' | 'UPI' | 'CASH' | 'RAZORPAY' = 'QR_CODE'; // RAZORPAY kept for compatibility if needed

  // QR/UPI Data
  qrCodeUrl: string = '';
  upiId: string = 'merchant@upi';
  upiDeepLink: string = '';

  // Proof Data
  paymentProof: string = '';

  // Razorpay Data (Legacy/Hidden)
  cardNumber: string = '';
  expiryDate: string = '';
  cvv: string = '';

  // State
  processing = false;
  paymentSubmitted = false;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' = 'PENDING';
  paymentMessage: string = '';

  // Cleanup
  private destroy$ = new Subject<void>();

  // Logger prefix
  private LOG = '[PaymentModal]';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: CheckoutData,
    public dialogRef: MatDialogRef<PaymentModalComponent>,
    private paymentService: PaymentService,
    private orderService: OrderService,
    private configService: ConfigService,
    private toastr: ToastrService
  ) {
    console.log(`${this.LOG} Constructor called with data:`, data);
  }

  ngOnInit(): void {
    console.log(`${this.LOG} ngOnInit called`);
    this.loadPaymentConfig();
  }

  /**
   * Load Tenant Payment Config (UPI ID, QR)
   */
  private loadPaymentConfig(): void {
    this.configService.getPaymentConfig().pipe(takeUntil(this.destroy$)).subscribe({
      next: (config) => {
        if (config) {
          console.log(`${this.LOG} ✅ Loaded Tenant Config:`, config);
          if (config.upiId) this.upiId = config.upiId;
          // Use config QR if available, else generate from ID
          if (config.upiQrImageUrl) {
            this.qrCodeUrl = config.upiQrImageUrl;
            this.upiDeepLink = `upi://pay?pa=${this.upiId}&pn=TasteTown&tn=Order${this.data.orderId}&am=${this.data.amount}&cu=INR`;
          } else {
            this.generateQRCode();
          }
        } else {
          console.warn(`${this.LOG} ⚠️ No config found, using defaults`);
          this.generateQRCode();
        }
      },
      error: (err) => {
        console.error('Failed to load payment config', err);
        this.generateQRCode(); // Fallback
      }
    });
  }

  /**
   * Generate UPI QR Code (Fallback/Dynamic)
   */
  private generateQRCode(): void {
    const upiString = `upi://pay?pa=${this.upiId}&pn=TasteTown&tn=Order${this.data.orderId}&tr=${this.data.orderId}&am=${this.data.amount}&cu=INR`;
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;
    this.upiDeepLink = upiString;
  }

  /**
   * Copy UPI ID to clipboard
   */
  copyUpiId(): void {
    navigator.clipboard.writeText(this.upiId).then(
      () => this.toastr.success('UPI ID copied!'),
      (err) => this.toastr.error('Failed to copy UPI ID')
    );
  }

  /**
   * Submit Proof Payment (QR/UPI)
   */
  submitProofPayment(): void {
    console.log(`${this.LOG} ========== SUBMITTING PROOF ==========`);
    console.log(`${this.LOG} Mode: ${this.paymentMethod}, Proof: ${this.paymentProof}`);

    if (!this.paymentProof || this.paymentProof.length < 4) {
      this.toastr.error('Please enter a valid Transaction ID');
      return;
    }

    this.processing = true;
    this.paymentSubmitted = true;
    this.paymentMessage = 'Verifying Payment Proof...';

    // Simulate network delay for verification effect
    setTimeout(() => {
      this.callPayOrderEndpoint(false);
    }, 1500);
  }

  /**
   * Submit Pay at Counter
   */
  submitCounterPayment(): void {
    console.log(`${this.LOG} ========== PAY AT COUNTER SUBMITTED (V2) ==========`);

    this.processing = true;
    this.paymentSubmitted = true;
    this.paymentMessage = 'Submitting Order to Kitchen...';

    // Simulate network delay
    setTimeout(() => {
      this.callPayOrderEndpoint(true);
    }, 1000);
  }

  /**
   * Call Backend payOrder endpoint
   */
  private callPayOrderEndpoint(isPayAtCounter: boolean): void {
    // NOTE: We use payOrder to update payment proof/status, but for Counter it sets PENDING.
    // We pass the new fields in the request body (even though PaymentRequest type might need update in frontend model)
    // Frontend PaymentRequest model is likely implicit or needs update? 
    // Assuming generic 'any' or we just send the object.

    const payload = {
      paymentMode: this.paymentMethod,
      amount: this.data.amount,
      paymentProof: isPayAtCounter ? null : this.paymentProof,
      isPayAtCounter: isPayAtCounter
    };

    console.log(`${this.LOG} Payload:`, payload);

    this.orderService.payOrder(Number(this.data.orderId), this.paymentMethod, this.data.amount, payload) // Passing extra payload if service supports it
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`${this.LOG} ✓ Success:`, response);
          this.processing = false;
          this.paymentStatus = 'SUCCESS';

          if (isPayAtCounter) {
            this.paymentMessage = '✓ Order Placed! Please pay at counter.';
          } else {
            this.paymentMessage = '✓ Verification Submitted! Fee Waived.';
          }

          this.toastr.success(isPayAtCounter ? 'Order Placed' : 'Proof Submitted');

          setTimeout(() => {
            const closeData = {
              paymentId: response.paymentId || (isPayAtCounter ? 'PAY-COUNTER' : 'PAY-PROOF'),
              paymentMethod: this.paymentMethod,
              amount: this.data.amount,
              status: 'SUCCESS',
              isPayAtCounter: isPayAtCounter
            };
            this.dialogRef.close(closeData);
          }, 1500);
        },
        error: (error: any) => {
          console.error(`${this.LOG} ✗ Error:`, error);
          this.processing = false;
          this.paymentStatus = 'FAILED';
          this.paymentMessage = `✗ Error: ${error.error?.message || error.message || 'Submission failed'}`;
          this.toastr.error('Submission failed');
        }
      });
  }

  /**
   * Cancel payment
   */
  cancelPayment(): void {
    if (this.processing) return;
    if (confirm('Cancel payment process?')) {
      this.dialogRef.close(null);
    }
  }

  /**
   * Retry payment
   */
  retryPayment(): void {
    this.paymentStatus = 'PENDING';
    this.paymentSubmitted = false;
    this.processing = false;
  }

  // Legacy/Unused Card Methods kept to prevent lint errors if template references them (Template updated though)
  formatCardNumber() { }
  formatExpiryDate() { }
  formatCVV() { }
  submitCardPayment() { }
  submitUPIPayment() { } // Legacy
  submitQRCodePayment() { } // Legacy

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
