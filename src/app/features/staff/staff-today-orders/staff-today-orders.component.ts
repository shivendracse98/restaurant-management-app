import { Component, OnInit } from '@angular/core';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../models/order.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-staff-today-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './staff-today-orders.component.html',
  styleUrls: ['./staff-today-orders.component.scss']
})
export class StaffTodayOrdersComponent implements OnInit {
  todayOrders: Order[] = [];
  loading = true;
  todayDate = new Date().toLocaleDateString();

  constructor(private orderService: OrderService) { }

  ngOnInit(): void {
    this.fetchTodayOrders();
  }

  fetchTodayOrders(): void {
    this.loading = true;
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        const today = new Date().toISOString().split('T')[0];
        this.todayOrders = (orders || []).filter((o) => {
          const orderDate = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '';
          return orderDate === today;
        });
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  getTotalRevenue(): number {
    return this.todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  }

  /** ✅ Verify Payment (New) */
  verifyPayment(order: any): void {
    if (!confirm(`Verify payment for Order #${order.id}?`)) return;

    this.orderService.verifyPayment(order.id).subscribe({
      next: () => {
        alert('✅ Payment Verified! Order Confirmed.');
        // Refresh needed as this is a simple list
        this.fetchTodayOrders();
      },
      error: (err) => {
        console.error('❌ Verification failed', err);
        alert('Verification failed.');
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'DELIVERED':
      case 'COMPLETED':
        return 'status-completed';
      case 'PENDING':
      case 'ONGOING':
        return 'status-ongoing';
      case 'CONFIRMED': return 'status-confirmed';
      default:
        return 'status-other';
    }
  }
}
