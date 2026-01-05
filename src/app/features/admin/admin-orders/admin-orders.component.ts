import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Added for ngModel binding
import { OrderService } from '../../../core/services/order.service';
import { Subject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { FeatureFlagStore } from '../../../core/feature-flag/feature-flag.store';
import { AssignDriverModalComponent } from './components/assign-driver-modal/assign-driver-modal.component';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignDriverModalComponent],
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.scss']
})
export class AdminOrdersComponent implements OnInit, OnDestroy {
  @ViewChild(AssignDriverModalComponent) driverModal!: AssignDriverModalComponent;

  orders: any[] = [];
  loading = false;
  errorMsg = '';
  sortOption: string = 'newest';
  selectedDate: string | null = null; // 📅 New Property

  readonly featureFlagStore = inject(FeatureFlagStore);
  private destroy$ = new Subject<void>();

  constructor(private orderService: OrderService) {
    // Load flags early to have them available for templates
    this.featureFlagStore.loadFlags();
  }

  ngOnInit(): void {
    this.pollOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  pollOrders(): void {
    this.loading = true;
    timer(0, 5000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.orderService.refreshOrders())
      )
      .subscribe({
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

  get sortedOrders(): any[] {
    let filtered = [...this.orders];

    // 📅 Date Filtering Logic
    if (this.selectedDate) {
      filtered = filtered.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDate === this.selectedDate;
      });
    }

    // ⬇️ Sorting Logic
    switch (this.sortOption) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'customer_asc':
        return filtered.sort((a, b) => (a.customerName || '').localeCompare(b.customerName || ''));
      case 'customer_desc':
        return filtered.sort((a, b) => (b.customerName || '').localeCompare(a.customerName || ''));
      default:
        return filtered;
    }
  }

  clearDateFilter() {
    this.selectedDate = null;
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

  /** ✅ Verify Payment (Admin/Staff) */
  verifyPayment(order: any): void {
    if (!confirm(`Verify payment for Order #${order.id}?`)) return;

    this.orderService.verifyPayment(order.id).subscribe({
      next: () => {
        alert('✅ Payment Verified! Order Confirmed.');
        // Update local state to reflect change immediately
        order.status = 'CONFIRMED';
        order.paymentStatus = 'PAID';
        // Force refresh or let polling handle it
      },
      error: (err) => {
        console.error('❌ Verification failed', err);
        alert('Verification failed.');
      }
    });
  }

  openAssignDriver(order: any) {
    this.driverModal.open(order.id);
  }

  onDriverAssigned() {
    // Refresh orders to show updated status (OUT_FOR_DELIVERY)
    this.pollOrders(); // Actually, just triggering one refresh is better than restarting polling
    // But pollOrders restarts the timer. Let's just do a manual refresh or let the polling catch it.
    // For immediate feedback:
    this.orderService.refreshOrders().subscribe(data => this.orders = data);
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }
}
