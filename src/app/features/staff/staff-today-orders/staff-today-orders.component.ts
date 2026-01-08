import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../models/order.model';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FeatureFlagStore } from '../../../core/feature-flag/feature-flag.store';
import { AssignDriverModalComponent } from '../../admin/admin-orders/components/assign-driver-modal/assign-driver-modal.component';

@Component({
  selector: 'app-staff-today-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, AssignDriverModalComponent],
  templateUrl: './staff-today-orders.component.html',
  styleUrls: ['./staff-today-orders.component.scss']
})
export class StaffTodayOrdersComponent implements OnInit {
  @ViewChild(AssignDriverModalComponent) driverModal!: AssignDriverModalComponent;

  todayOrders: Order[] = [];
  loading = true;
  todayDate = new Date().toLocaleDateString();

  activeTab: 'ALL' | 'DINE_IN' | 'DELIVERY' = 'ALL';

  readonly featureFlagStore = inject(FeatureFlagStore);

  constructor(private orderService: OrderService) {
    this.featureFlagStore.loadFlags();
  }

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

  get filteredOrders(): Order[] {
    if (this.activeTab === 'ALL') return this.todayOrders;
    if (this.activeTab === 'DELIVERY') return this.todayOrders.filter(o => o.orderType === 'DELIVERY');
    // Dine-In tab includes Dine-In and others (non-delivery)
    return this.todayOrders.filter(o => o.orderType !== 'DELIVERY');
  }

  setTab(tab: 'ALL' | 'DINE_IN' | 'DELIVERY'): void {
    this.activeTab = tab;
  }

  openAssignDriver(order: any) {
    this.driverModal.open(order.id);
  }

  onDriverAssigned() {
    this.fetchTodayOrders();
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
