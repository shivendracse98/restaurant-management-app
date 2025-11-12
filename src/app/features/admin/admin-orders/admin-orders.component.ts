import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss']
})
export class AdminOrdersComponent implements OnInit {
  orders: any[] = [];
  loading = false;
  errorMsg = '';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.loading = false;
      },
      error: (err: unknown) => {
        console.error('❌ Failed to load orders:', err);
        this.errorMsg = 'Failed to load orders.';
        this.loading = false;
      }
    });
  }

  /** ✅ Handle dropdown change safely */
  onStatusChange(order: any, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const status = select.value;
    this.updateStatus(order, status);
  }

  updateStatus(order: any, status: string): void {
    order.status = status;
    this.orderService.updateOrderStatus(order.id, status).subscribe({
      next: () => console.log(`✅ Updated order ${order.id} → ${status}`),
      error: (err: unknown) => console.error('❌ Error updating status:', err)
    });
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }
}
