import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import type { Order } from '../../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  errorMsg = '';

  constructor(
    private orderService: OrderService,
    private auth: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.orderService.getOrders().subscribe({
      next: (allOrders: any[]) => {
        // Filter orders for logged-in user
        this.orders = allOrders
          .filter(o => o.customerEmail === user.email)
          .sort((a, b) => {
            const aDate = new Date(a.createdAt || '').getTime();
            const bDate = new Date(b.createdAt || '').getTime();
            return bDate - aDate; // newest first
          });
        this.loading = false;
      },
      error: (err: any) => {
        console.error('❌ Failed to load orders', err);
        this.errorMsg = 'Failed to load orders. Please try again.';
        this.loading = false;
      }
    });
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  reorder(order: Order) {
    alert(`🔁 Reordering ${order.items.length} items (feature coming soon)`);
  }

  cancel(order: Order) {
    if (confirm('Are you sure you want to cancel this order?')) {
      this.orderService.updateOrderStatus(Number(order.id), 'CANCELLED').subscribe({
        next: () => {
          alert('❌ Order cancelled successfully.');
          this.ngOnInit(); // reload list
        },
        error: (err: any) => console.error('Error cancelling order', err)
      });
    }
  }
}
