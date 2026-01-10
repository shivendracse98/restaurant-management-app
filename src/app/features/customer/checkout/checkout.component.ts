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
import { TenantService } from 'src/app/core/services/tenant.service';
import { ConfigService } from 'src/app/core/services/config.service';
import { GuestSessionService } from 'src/app/core/services/guest-session.service'; // ✅ Added
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ... (Component Metadata remains same)
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

  private LOG = '[CheckoutComponent]';

  constructor(
    private fb: FormBuilder,
    public cartService: CartService,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private tenantService: TenantService,
    private configService: ConfigService,
    private guestSessionService: GuestSessionService // ✅ Injected
  ) {
    console.log(`${this.LOG} Constructor called`);
    this.initializeForm();
  }

  // Guest Session State
  existingSessionOrder: any = null; // Stores Order details if valid
  existingSessionKey: string | null = null; // Stores UUID Key
  confirmedAppend: boolean = false;
  showAppendPrompt: boolean = false;

  // Delivery Config
  tenantConfig: any = null;
  deliveryFee: number = 0;
  isDeliveryAvailable: boolean = true;
  deliveryError: string | null = null;
  isTableOrder: boolean = false;

  ngOnInit(): void {
    console.log(`${this.LOG} ngOnInit called`);
    this.loadTenantConfig();
    this.loadCheckoutData();
    this.checkGuestSession(); // ✅ New Secure Logic

    this.form.get('orderType')?.valueChanges.subscribe(() => this.calculateTotal());
    this.form.get('deliveryPincode')?.valueChanges.subscribe(() => this.calculateTotal());
  }

  /**
   * ✅ NEW Secure Check
   */
  checkGuestSession(): void {
    const activeKey = this.guestSessionService.getValidGuestKey();
    if (!activeKey) return;

    this.orderService.trackGuestOrder(activeKey).subscribe({
      next: (order) => {
        const activeStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'];
        // Note: DELIVERED/CLOSED blocked by backend logic anyway, but good to filter here too.

        if (activeStatuses.includes(order.status)) {
          this.existingSessionOrder = order;
          this.existingSessionKey = activeKey; // Store key for Append
          this.showAppendPrompt = true;
          console.log(`${this.LOG} Active secure session found: #${order.id}.`);
        } else {
          // If status is PAID/CLOSED, maybe just ignore or clear?
          // Let's clear to avoid confusion.
          this.guestSessionService.clearSession();
        }
      },
      error: () => this.guestSessionService.clearSession()
    });
  }

  confirmAppend(): void {
    if (!this.existingSessionOrder) return;
    this.confirmedAppend = true;
    this.showAppendPrompt = false;

    // Auto-fill form details
    this.form.patchValue({
      customerName: this.existingSessionOrder.customerName,
      customerPhone: this.existingSessionOrder.customerPhone,
      tableNumber: this.existingSessionOrder.tableNumber,
      orderType: this.existingSessionOrder.orderType
    });

    this.toastr.info(`Added to Order #${this.existingSessionOrder.id}`, 'Order Linked');
  }

  startNewOrder(): void {
    this.guestSessionService.clearSession(); // ✅ Secure Clear
    this.existingSessionOrder = null;
    this.existingSessionKey = null;
    this.confirmedAppend = false;
    this.showAppendPrompt = false;
    this.toastr.info('Starting a fresh order', 'New Order');
  }

  // ... (loadTenantConfig, calculateTotal, initializeForm, loadCheckoutData - UNCHANGED)
  loadTenantConfig() {
    this.configService.getPaymentConfig().subscribe((config: any) => {
      this.tenantConfig = config;
      console.log('Tenant Config Loaded:', config);
      this.calculateTotal();
    });
  }

  calculateTotal() {
    const rawTotal = this.cartService.getTotal();
    this.deliveryFee = 0;
    this.deliveryError = null;
    this.isDeliveryAvailable = true;

    const orderType = this.form.get('orderType')?.value;

    if (orderType === 'DELIVERY' && this.tenantConfig) {
      if (this.tenantConfig.isDeliveryEnabled === false) {
        this.isDeliveryAvailable = false;
        this.deliveryError = "Delivery is currently disabled by admin.";
        return;
      }
      if (this.tenantConfig.isAcceptingDelivery === false) {
        this.isDeliveryAvailable = false;
        this.deliveryError = "Restaurant is not accepting delivery orders right now.";
        return;
      }
      const enteredPin = this.form.get('deliveryPincode')?.value;
      if (this.tenantConfig.serviceablePincodes && this.tenantConfig.serviceablePincodes.trim().length > 0) {
        if (!enteredPin || enteredPin.length < 6) { } else {
          const allowedPins = this.tenantConfig.serviceablePincodes.split(',').map((p: string) => p.trim());
          if (!allowedPins.includes(enteredPin)) {
            this.isDeliveryAvailable = false;
            this.deliveryError = `Sorry, we do not deliver to ${enteredPin}.`;
          }
        }
      }
      if (this.deliveryError) { this.total = rawTotal; return; }
      if (this.tenantConfig.minOrderAmount && rawTotal < this.tenantConfig.minOrderAmount) {
        this.deliveryError = `Minimum order for delivery is ₹${this.tenantConfig.minOrderAmount}`;
      }
      if (this.tenantConfig.deliveryFee) {
        const threshold = this.tenantConfig.freeDeliveryThreshold || 0;
        if (threshold > 0 && rawTotal >= threshold) { this.deliveryFee = 0; } else { this.deliveryFee = this.tenantConfig.deliveryFee; }
      }
    }
    this.total = rawTotal + this.deliveryFee;
  }

  private initializeForm(): void {
    console.log(`${this.LOG} Initializing form`);
    const tableId = sessionStorage.getItem('rms_table_id');
    this.isTableOrder = !!tableId;

    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      customerPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      customerEmail: ['', [Validators.email]],
      address: [''],
      orderType: [this.isTableOrder ? 'DINE_IN' : 'DELIVERY', Validators.required],
      deliveryPincode: [''],
      locationLink: ['']
    });

    if (this.isTableOrder) { // Table Order Tweaks
      this.form.get('customerEmail')?.clearValidators();
      this.form.get('customerEmail')?.updateValueAndValidity();
    }

    this.form.get('orderType')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(type => {
      const addrCtrl = this.form.get('address');
      const pinCtrl = this.form.get('deliveryPincode');
      if (type === 'DELIVERY') {
        addrCtrl?.setValidators([Validators.required, Validators.minLength(5)]);
        pinCtrl?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
      } else {
        addrCtrl?.clearValidators();
        pinCtrl?.clearValidators();
      }
      addrCtrl?.updateValueAndValidity();
      pinCtrl?.updateValueAndValidity();
    });
    this.form.get('orderType')?.updateValueAndValidity({ emitEvent: true });
  }

  private loadCheckoutData(): void {
    console.log(`${this.LOG} Loading checkout data...`);
    this.loading = true;
    this.authService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe({
      next: (user: any) => {
        this.currentUser = user;
        if (user) {
          this.form.patchValue({
            customerName: user.name || '',
            customerPhone: user.phone || user.phoneNumber || '',
            customerEmail: user.email || '',
            address: user.address || ''
          });
        }
        this.loading = false;
      },
      error: (err: any) => { this.loading = false; }
    });
    this.cart.items = this.cartService.items;
    this.total = this.cartService.getTotal();

    if (this.cart.items.length === 0) {
      this.toastr.warning('Your cart is empty');
      setTimeout(() => this.router.navigate(['/customer/menu']), 2000);
    }
  }

  submit(): void {
    console.log(`${this.LOG} ========== SUBMIT ==========`);
    if (this.form.invalid) {
      this.toastr.error('Please fill all required fields correctly');
      this.markFormGroupTouched(this.form);
      return;
    }
    if (this.cartService.getCount() === 0) {
      this.toastr.error('Your cart is empty');
      return;
    }
    if (this.form.get('orderType')?.value === 'DELIVERY' && this.deliveryError) {
      this.toastr.error(this.deliveryError);
      return;
    }

    this.submitting = true;
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
      deliveryAddress: formValue.address,
      deliveryPincode: formValue.deliveryPincode,
      locationLink: formValue.locationLink,
      orderType: formValue.orderType,
      items: orderItems,
      total: this.total,
      userId: this.currentUser?.id,
      restaurantId: this.tenantService.getTenantId() || 'Maa-Ashtabhuja',
      tableNumber: sessionStorage.getItem('rms_table_id') || '',
      status: 'PENDING' as any,
      createdAt: new Date().toISOString()
    };

    // ✅ SECURE SUBMIT LOGIC
    // 1. If Active Session + Confirmed Append -> Call Append API
    // 2. Else -> Call Create API

    let request$;
    if (this.existingSessionOrder && this.confirmedAppend && this.existingSessionKey) {
      console.log(`${this.LOG} Appending to Order via Secure Key`);
      request$ = this.orderService.appendGuestOrder(this.existingSessionKey, orderItems);
    } else {
      console.log(`${this.LOG} Creating New Order`);
      request$ = this.orderService.createOrder(orderData as any);
    }

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (responseOrder: any) => {
          console.log(`${this.LOG} ✓ Order processed:`, responseOrder);

          // ✅ Save Secure Session (If New Order)
          if (!this.existingSessionOrder && responseOrder.accessKey) {
            console.log(`${this.LOG} Saving secure session:`, responseOrder.accessKey);
            this.guestSessionService.saveGuestSession(responseOrder.id, responseOrder.accessKey);
          } else if (!this.existingSessionOrder) {
            // Fallback if backend didn't return accessKey (should not happen if migration ran)
            // Or if logged-in user (no key needed usually, but good to check)
            console.warn('No accessKey returned! Is backend updated?');
          }

          if (formValue.orderType === 'DINE_IN' || formValue.orderType === 'PICKUP') {
            const msg = this.existingSessionOrder ? '✓ Items added to your order!' : '✓ Order placed! Please pay at the counter.';
            this.toastr.success(msg);
            this.cartService.clear();

            // Redirect using UUID if available specifically for tracking
            // Since `order-tracking/:id` works via ID, we rely on `checkGuestSession` to use key internally?
            // Wait, tracking page needs to be protected too?
            // For now, we redirect to standard tracking page. 
            // The Tracking Page should ALSO check storage? Or use `order-tracking/uuid`?
            // Design said: /order-tracking/uuid...
            // But let's stick to ID for URL if the component handles the secure fetch?
            // Actually, design said -> /order-tracking/{uuid}
            // For now, let's keep it simple: Navigate to ID, but ensure Tracking Component uses Key if user is guest.
            // Or better: Navigate to `/order-tracking/<accessKey>` if we have it?

            // Let's use ID for now and let the Tracking Component resolve permissions via the Key it finds in localStorage.

            setTimeout(() => {
              this.router.navigate(['/order-tracking', responseOrder.id]);
            }, 1500);
          } else {
            this.openPaymentModal(responseOrder);
          }
        },
        error: (error: any) => {
          console.error(`${this.LOG} ✗ Order failed:`, error);
          this.submitting = false;
          if (error.status === 409) {
            this.toastr.error('Cannot add items. Bill is already being settled.');
            this.startNewOrder(); // Reset UI state on Conflict
          } else {
            this.toastr.error('Failed to process order. Please try again.');
          }
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
            this.router.navigate(['/order-tracking', order.id]);
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
