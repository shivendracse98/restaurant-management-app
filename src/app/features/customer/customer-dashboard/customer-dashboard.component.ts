import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../models/order.model';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-dashboard.component.html',
  styleUrls: ['./customer-dashboard.component.scss']
})
export class CustomerDashboardComponent implements OnInit {
  activeOrder: Order | null = null;
  loading = true;

  constructor(
    public auth: AuthService,
    private orderService: OrderService
  ) { }

  ngOnInit() {
    this.fetchActiveOrder();
  }

  fetchActiveOrder() {
    this.orderService.getMyOrders().subscribe({
      next: (orders) => {
        // Find the most recent active order (not delivered/cancelled)
        // Sort by ID descending (newest first), ensuring ID exists
        const sorted = orders
          .filter(o => o.id !== undefined)
          .sort((a, b) => (b.id!) - (a.id!));

        // Active statuses
        const activeStatuses = ['PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

        this.activeOrder = sorted.find(o => activeStatuses.includes(o.status)) || null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch orders', err);
        this.loading = false;
      }
    });
  }
}
