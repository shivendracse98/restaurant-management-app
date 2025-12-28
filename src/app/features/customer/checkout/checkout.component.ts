// src/app/features/customer/components/checkout/checkout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { CartService, CartItem } from 'src/app/core/services/cart.service';
import { OrderService } from 'src/app/core/services/order.service';
import { PaymentService } from 'src/app/core/services/payment.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { PaymentModalComponent } from './payment-modal.component';

import { ToastrModule, ToastrService } from 'ngx-toastr';  // ✅ Import both
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, PaymentModalComponent],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  // Form
  form!: FormGroup;

  // Data
  cart = {
    items: [] as CartItem[],
    getCount: function () { return this.items.length; }
  };
  total: number = 0;
  currentUser: any = null;

  // State
  loading = false;
  submitting = false;

  // Cleanup
  private destroy$ = new Subject<void>();

  // Logger prefix
  private LOG = '[CheckoutComponent]';

  constructor(
    private fb: FormBuilder,
    public cartService: CartService,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    console.log(`${this.LOG} Constructor called`);
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log(`${this.LOG} ngOnInit called`);
    this.loadCheckoutData();
  }

  /**
   * Initialize form with validators
   */
  private initializeForm(): void {
    console.log(`${this.LOG} Initializing form`);
    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      customerPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      customerEmail: ['', [Validators.required, Validators.email]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      orderType: ['DELIVERY', Validators.required]
    });
    console.log(`${this.LOG} Form initialized`, this.form);
  }

  /**
   * Load checkout data (user info, cart items)
   */
  private loadCheckoutData(): void {
    console.log(`${this.LOG} Loading checkout data...`);
    this.loading = true;

    // Get current user
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: any) => {
          console.log(`${this.LOG} User loaded:`, user);
          this.currentUser = user;
          if (user) {
            this.form.patchValue({
              customerName: user.name || '',
              customerPhone: user.phone || '',
              customerEmail: user.email || '',
              address: user.address || ''
            });
            console.log(`${this.LOG} Form pre-filled with user data`);
          }
          this.loading = false;
        },
        error: (err: any) => {
          console.error(`${this.LOG} Error loading user:`, err);
          this.loading = false;
        }
      });

    // Get cart items from CartService
    this.cart.items = this.cartService.items;
    this.total = this.cartService.getTotal();

    console.log(`${this.LOG} Cart items:`, this.cart.items);
    console.log(`${this.LOG} Cart total:`, this.total);
    console.log(`${this.LOG} Cart count:`, this.cartService.getCount());

    if (this.cart.items.length === 0) {
      console.warn(`${this.LOG} Cart is empty!`);
      this.toastr.warning('Your cart is empty');
      setTimeout(() => this.router.navigate(['/customer/menu']), 2000);
    }
  }

  /**
   * Submit form and place order
   */
  submit(): void {
    console.log(`${this.LOG} ========== SUBMIT BUTTON CLICKED ==========`);
    console.log(`${this.LOG} Form valid:`, this.form.valid);
    console.log(`${this.LOG} Form value:`, this.form.value);
    console.log(`${this.LOG} Cart items:`, this.cart.items);
    console.log(`${this.LOG} Cart count:`, this.cartService.getCount());

    // Validate form
    if (this.form.invalid) {
      console.error(`${this.LOG} Form is INVALID`);
      console.error(`${this.LOG} Form errors:`, this.form.errors);
      Object.keys(this.form.controls).forEach(key => {
        const control = this.form.get(key);
        if (control?.invalid) {
          console.error(`${this.LOG}   - ${key}: ${JSON.stringify(control.errors)}`);
        }
      });
      this.toastr.error('Please fill all required fields correctly');
      this.markFormGroupTouched(this.form);
      return;
    }

    if (this.cartService.getCount() === 0) {
      console.error(`${this.LOG} Cart is EMPTY`);
      this.toastr.error('Your cart is empty');
      return;
    }

    console.log(`${this.LOG} ✓ Validation passed, starting order creation...`);
    this.submitting = true;

    // Prepare order data
    const formValue = this.form.value;
    const orderItems = this.cartService.items.map(item => ({
      id: item.menuItem.id,
      name: item.menuItem.name,
      price: item.menuItem.price,
      qty: item.qty,
      category: item.menuItem.category,
      imageUrl: item.menuItem.imageUrl
    }));

    const orderData = {
      customerName: formValue.customerName,
      customerPhone: formValue.customerPhone,
      customerEmail: formValue.customerEmail,
      address: formValue.address,
      orderType: formValue.orderType,
      items: orderItems,
      total: this.cartService.getTotal(),
      userId: this.currentUser?.id,
      status: 'PENDING' as any,
      createdAt: new Date().toISOString()
    };

    console.log(`${this.LOG} Order data prepared:`, orderData);

    // Step 1: Create order
    console.log(`${this.LOG} Calling orderService.createOrder()...`);
    this.orderService.createOrder(orderData as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdOrder: any) => {
          console.log(`${this.LOG} ✓ Order created successfully:`, createdOrder);
          console.log(`${this.LOG} Order ID:`, createdOrder.id);
          console.log(`${this.LOG} Order Total:`, createdOrder.total);

          // Step 2: Show payment modal
          this.openPaymentModal(createdOrder);
        },
        error: (error: any) => {
          console.error(`${this.LOG} ✗ Order creation failed:`, error);
          console.error(`${this.LOG} Error status:`, error.status);
          console.error(`${this.LOG} Error message:`, error.message);
          console.error(`${this.LOG} Full error:`, error);

          this.submitting = false;
          this.toastr.error('Failed to create order. Please try again.');
        }
      });
  }

  /**
   * Open payment modal for UPI/QR payment
   */
  private openPaymentModal(order: any): void {
    console.log(`${this.LOG} Opening payment modal for order:`, order.id);

    const dialogData = {
      orderId: order.id,
      amount: order.total,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail
    };

    console.log(`${this.LOG} Payment modal data:`, dialogData);

    const dialogRef = this.dialog.open(PaymentModalComponent, {
      width: '90%',
      maxWidth: '500px',
      data: dialogData,
      disableClose: false
    });

    console.log(`${this.LOG} Modal opened`);

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: any) => {
        console.log(`${this.LOG} Modal closed with result:`, result);

        if (result && result.paymentId) {
          console.log(`${this.LOG} ✓ Payment successful, paymentId:`, result.paymentId);
          // Payment successful
          this.handlePaymentSuccess(order, result);
        } else {
          // Payment cancelled
          console.log(`${this.LOG} ⚠️ Payment cancelled or no result`);
          this.submitting = false;
          this.toastr.warning('Payment cancelled');
        }
      });
  }

  /**
   * Handle successful payment
   */
  private handlePaymentSuccess(order: any, paymentResult: any): void {
    console.log(`${this.LOG} Handling payment success...`);
    console.log(`${this.LOG} Payment result:`, paymentResult);

    // Update order status
    const updatedOrder = {
      ...order,
      status: 'CONFIRMED',
      paymentId: paymentResult.paymentId,
      paymentMethod: paymentResult.paymentMethod || 'UPI',
      paymentStatus: 'COMPLETED'
    };

    console.log(`${this.LOG} Updating order with payment details:`, updatedOrder);

    this.orderService.updateOrder(order.id, updatedOrder as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: any) => {
          console.log(`${this.LOG} ✓ Order confirmed:`, result);
          this.submitting = false;

          // Clear cart
          console.log(`${this.LOG} Clearing cart...`);
          this.cartService.clear();
          console.log(`${this.LOG} ✓ Cart cleared`);

          // Show success notification
          this.toastr.success('✓ Order placed successfully!');

          // Redirect to order tracking
          console.log(`${this.LOG} Redirecting to order tracking for order:`, order.id);
          setTimeout(() => {
            this.router.navigate(['/customer/order-tracking', order.id]);
          }, 2000);
        },
        error: (error: any) => {
          console.error(`${this.LOG} ✗ Order update failed:`, error);
          console.error(`${this.LOG} Error details:`, error);

          this.submitting = false;
          this.toastr.error('Order confirmation failed');
        }
      });
  }

  /**
   * Mark form as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    console.log(`${this.LOG} Marking form as touched`);
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  ngOnDestroy(): void {
    console.log(`${this.LOG} Component destroyed`);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
