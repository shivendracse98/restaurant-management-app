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
  // Payment options: QR_CODE | UPI | RAZORPAY
  paymentMethod: 'QR_CODE' | 'UPI' | 'RAZORPAY' = 'QR_CODE';

  // QR/UPI Data
  qrCodeUrl: string = '';
  upiId: string = 'merchant@upi';
  upiDeepLink: string = '';

  // Razorpay Data
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
    private configService: ConfigService, // ✅ Injected
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
          if (config.qrImageUrl) {
            this.qrCodeUrl = config.qrImageUrl;
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
    console.log(`${this.LOG} Generating QR code for amount: ${this.data.amount}`);
    const upiString = `upi://pay?pa=${this.upiId}&pn=TasteTown&tn=Order${this.data.orderId}&tr=${this.data.orderId}&am=${this.data.amount}&cu=INR`;

    console.log(`${this.LOG} UPI string:`, upiString);

    // Generate QR code using free API
    this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

    console.log(`${this.LOG} QR code URL:`, this.qrCodeUrl);

    // Create deep link for UPI apps
    this.upiDeepLink = upiString;
  }

  /**
   * Copy UPI ID to clipboard
   */
  copyUpiId(): void {
    console.log(`${this.LOG} Copying UPI ID: ${this.upiId}`);
    navigator.clipboard.writeText(this.upiId).then(
      () => {
        console.log(`${this.LOG} ✓ UPI ID copied successfully`);
        this.toastr.success('UPI ID copied!');
      },
      (err: any) => {
        console.error(`${this.LOG} ✗ Failed to copy UPI ID:`, err);
        this.toastr.error('Failed to copy UPI ID');
      }
    );
  }

  /**
   * Submit QR Code Payment
   */
  submitQRCodePayment(): void {
    console.log(`${this.LOG} ========== QR CODE PAYMENT SUBMITTED ==========`);
    console.log(`${this.LOG} Order ID:`, this.data.orderId);
    console.log(`${this.LOG} Amount:`, this.data.amount);

    this.processing = true;
    this.paymentSubmitted = true;

    // Simulate verification - in production, call backend
    console.log(`${this.LOG} Starting 2 second verification delay...`);
    setTimeout(() => {
      console.log(`${this.LOG} Calling processQRCodeVerification()`);
      this.processQRCodeVerification();
    }, 2000);
  }

  /**
   * Process QR Code verification
   */
  private processQRCodeVerification(): void {
    console.log(`${this.LOG} Processing QR code verification...`);

    const verificationData = {
      orderId: this.data.orderId,
      amount: this.data.amount,
      paymentMethod: 'QR_CODE'
    };

    console.log(`${this.LOG} Verification data:`, verificationData);
    console.log(`${this.LOG} Calling paymentService.verifyUPIPayment()`);

    this.paymentService.verifyUPIPayment(verificationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`${this.LOG} ✓ Verification response:`, response);
          this.processing = false;

          if (response.status === 'SUCCESS' || response.verified) {
            console.log(`${this.LOG} ✓ Payment verified successfully`);
            this.paymentStatus = 'SUCCESS';
            this.paymentMessage = '✓ QR Code Payment Verified!';
            this.toastr.success('Payment verified');

            // Close dialog with payment details
            console.log(`${this.LOG} Closing modal with success in 1.5 seconds`);
            setTimeout(() => {
              const closeData = {
                paymentId: response.paymentId || this.generatePaymentId(),
                paymentMethod: 'QR_CODE',
                amount: this.data.amount,
                status: 'SUCCESS'
              };
              console.log(`${this.LOG} Closing with data:`, closeData);
              this.dialogRef.close(closeData);
            }, 1500);
          } else {
            console.warn(`${this.LOG} ⚠️ Payment not confirmed`);
            this.paymentStatus = 'FAILED';
            this.paymentMessage = '✗ Payment not confirmed. Try again.';
            this.toastr.warning('Payment not confirmed yet');
          }
        },
        error: (error: any) => {
          console.error(`${this.LOG} ✗ Verification error:`, error);
          this.processing = false;
          this.paymentStatus = 'FAILED';
          this.paymentMessage = `✗ Error: ${error.message || 'Unknown error'}`;
          this.toastr.error('Payment verification failed');
        }
      });
  }

  /**
   * Submit UPI Payment
   */
  submitUPIPayment(): void {
    console.log(`${this.LOG} ========== UPI PAYMENT SUBMITTED ==========`);
    console.log(`${this.LOG} Order ID:`, this.data.orderId);
    console.log(`${this.LOG} Amount:`, this.data.amount);
    console.log(`${this.LOG} UPI ID:`, this.upiId);

    this.processing = true;
    this.paymentSubmitted = true;

    // Simulate payment processing
    console.log(`${this.LOG} Starting 2 second processing delay...`);
    setTimeout(() => {
      console.log(`${this.LOG} Calling processUPIPayment()`);
      this.processUPIPayment();
    }, 2000);
  }

  /**
   * Process UPI payment
   */
  private processUPIPayment(): void {
    console.log(`${this.LOG} Processing UPI payment...`);

    const paymentData = {
      orderId: this.data.orderId,
      amount: this.data.amount,
      upiId: this.upiId,
      paymentMethod: 'UPI'
    };

    console.log(`${this.LOG} Payment data:`, paymentData);
    console.log(`${this.LOG} Calling paymentService.processUPIPayment()`);

    this.paymentService.processUPIPayment(paymentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`${this.LOG} ✓ UPI response:`, response);
          this.processing = false;

          if (response.status === 'SUCCESS' || response.success) {
            console.log(`${this.LOG} ✓ UPI payment successful`);
            this.paymentStatus = 'SUCCESS';
            this.paymentMessage = '✓ UPI Payment Successful!';
            this.toastr.success('Payment processed successfully');

            setTimeout(() => {
              const closeData = {
                paymentId: response.paymentId || this.generatePaymentId(),
                paymentMethod: 'UPI',
                amount: this.data.amount,
                status: 'SUCCESS'
              };
              console.log(`${this.LOG} Closing with data:`, closeData);
              this.dialogRef.close(closeData);
            }, 1500);
          } else {
            console.warn(`${this.LOG} ⚠️ UPI payment failed`);
            this.paymentStatus = 'FAILED';
            this.paymentMessage = '✗ UPI Payment Failed. Try again.';
            this.toastr.error('Payment failed');
          }
        },
        error: (error: any) => {
          console.error(`${this.LOG} ✗ UPI payment error:`, error);
          this.processing = false;
          this.paymentStatus = 'FAILED';
          this.paymentMessage = `✗ Error: ${error.message || 'Payment processing error'}`;
          this.toastr.error('Payment processing failed');
        }
      });
  }

  /**
   * Submit Razorpay Card Payment (Optional)
   */
  submitCardPayment(): void {
    console.log(`${this.LOG} ========== CARD PAYMENT SUBMITTED ==========`);
    console.log(`${this.LOG} Card number (last 4): ${this.cardNumber.slice(-4)}`);
    console.log(`${this.LOG} Amount:`, this.data.amount);

    // Validate card details
    if (!this.cardNumber || !this.expiryDate || !this.cvv) {
      console.warn(`${this.LOG} ⚠️ Missing card details`);
      this.toastr.error('Please fill all card details');
      return;
    }

    this.processing = true;
    this.paymentSubmitted = true;

    console.log(`${this.LOG} Starting 2 second processing delay...`);
    setTimeout(() => {
      console.log(`${this.LOG} Calling processCardPayment()`);
      this.processCardPayment();
    }, 2000);
  }

  /**
   * Process card payment
   */
  private processCardPayment(): void {
    console.log(`${this.LOG} Processing card payment...`);

    const paymentData = {
      orderId: this.data.orderId,
      amount: this.data.amount,
      paymentMethod: 'RAZORPAY',
      cardNumber: this.cardNumber,
      expiryDate: this.expiryDate,
      cvv: this.cvv,
      customerName: this.data.customerName,
      customerEmail: this.data.customerEmail
    };

    console.log(`${this.LOG} Payment data (card last 4):`, { ...paymentData, cardNumber: this.cardNumber.slice(-4) });
    console.log(`${this.LOG} Calling paymentService.processCardPayment()`);

    this.paymentService.processCardPayment(paymentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log(`${this.LOG} ✓ Card payment response:`, response);
          this.processing = false;

          if (response.status === 'SUCCESS' || response.success) {
            console.log(`${this.LOG} ✓ Card payment successful`);
            this.paymentStatus = 'SUCCESS';
            this.paymentMessage = '✓ Card Payment Successful!';
            this.toastr.success('Payment processed successfully');

            setTimeout(() => {
              const closeData = {
                paymentId: response.paymentId || this.generatePaymentId(),
                paymentMethod: 'RAZORPAY',
                amount: this.data.amount,
                status: 'SUCCESS'
              };
              console.log(`${this.LOG} Closing with data:`, closeData);
              this.dialogRef.close(closeData);
            }, 1500);
          } else {
            console.warn(`${this.LOG} ⚠️ Card payment failed`);
            this.paymentStatus = 'FAILED';
            this.paymentMessage = '✗ Card Payment Failed. Try again.';
            this.toastr.error('Payment failed');
          }
        },
        error: (error: any) => {
          console.error(`${this.LOG} ✗ Card payment error:`, error);
          this.processing = false;
          this.paymentStatus = 'FAILED';
          this.paymentMessage = `✗ Error: ${error.message || 'Payment processing error'}`;
          this.toastr.error('Payment processing failed');
        }
      });
  }

  /**
   * Cancel payment
   */
  cancelPayment(): void {
    console.log(`${this.LOG} Cancel button clicked`);
    if (this.processing) {
      console.warn(`${this.LOG} ⚠️ Payment is processing, cannot cancel`);
      this.toastr.warning('Payment is processing. Please wait.');
      return;
    }

    if (confirm('Are you sure you want to cancel this payment?')) {
      console.log(`${this.LOG} ✓ User confirmed cancellation`);
      this.dialogRef.close(null);
    } else {
      console.log(`${this.LOG} User cancelled the cancellation`);
    }
  }

  /**
   * Retry payment
   */
  retryPayment(): void {
    console.log(`${this.LOG} Retry button clicked`);
    this.paymentStatus = 'PENDING';
    this.paymentSubmitted = false;
    this.cardNumber = '';
    this.expiryDate = '';
    this.cvv = '';
    console.log(`${this.LOG} Payment state reset for retry`);
  }

  /**
   * Format card number
   */
  formatCardNumber(): void {
    this.cardNumber = this.cardNumber.replace(/\D/g, '').substr(0, 16);
  }

  /**
   * Format expiry date
   */
  formatExpiryDate(): void {
    let value = this.expiryDate.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substr(0, 2) + '/' + value.substr(2, 2);
    }
    this.expiryDate = value.substr(0, 5);
  }

  /**
   * Format CVV
   */
  formatCVV(): void {
    this.cvv = this.cvv.replace(/\D/g, '').substr(0, 3);
  }

  /**
   * Generate payment ID (for mock mode)
   */
  private generatePaymentId(): string {
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`${this.LOG} Generated payment ID:`, paymentId);
    return paymentId;
  }

  ngOnDestroy(): void {
    console.log(`${this.LOG} Component destroyed`);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
