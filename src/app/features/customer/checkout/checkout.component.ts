import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { PaymentService } from '../../../core/services/payment.service';
import { AuthService } from '../../../core/services/auth.service';
import type { OrderStatus } from '../../../models/order.model';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  form = this.fb.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    address: ['', Validators.required],
    orderType: ['DELIVERY', Validators.required],
    special: ['']
  });

  loading = false;
  orderCreatedId?: string;

  constructor(
    private fb: FormBuilder,
    public cart: CartService,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({
        customerName: user.name || '',
        customerPhone: user.phone || '',
        address: user.address || '',
      });
    }
  }

  get total() {
    return this.cart.getTotal();
  }

  submit() {
    if (this.form.invalid || this.cart.getCount() === 0) {
      this.form.markAllAsTouched();
      alert('⚠️ Please fill all fields correctly before proceeding.');
      return;
    }

    this.loading = true;

    const user = this.auth.currentUser();
    const orderPayload = {
      customerName: user?.name || this.form.value.customerName!,
      customerEmail: user?.email,
      customerPhone: this.form.value.customerPhone!,
      address: this.form.value.address!,
      orderType: this.form.value.orderType!,
      items: this.cart.items.map(i => ({
        menuItemId: i.menuItem.id,
        qty: i.qty,
        price: i.menuItem.price,
        name: i.menuItem.name
      })),
      total: this.total,
      status: 'PENDING' as OrderStatus,
      createdAt: new Date().toISOString()
    };

    this.orderService.createOrder(orderPayload).subscribe({
      next: (created: any) => {
        this.orderCreatedId = created.id;

        this.paymentService.createPayment({
          orderId: created.id!,
          amount: created.total,
          method: 'UPI',
          status: 'PENDING'
        }).subscribe({
          next: () => {
            this.cart.clear();
            this.loading = false;
            this.router.navigate(['/orders']);
            alert(`✅ Order #${created.id} placed successfully!`);
          },
          error: (err: any) => {
            console.error(err);
            this.loading = false;
            alert('❌ Payment creation failed.');
          }
        });
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
        alert('❌ Order creation failed.');
      }
    });
  }
}
