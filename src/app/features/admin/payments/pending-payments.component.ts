import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { OrderService } from '../../../core/services/order.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-pending-payments',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatCardModule],
  templateUrl: './pending-payments.component.html',
  styleUrls: ['./pending-payments.component.scss']
})
export class PendingPaymentsComponent implements OnInit {
  displayedColumns: string[] = [
    'orderId',
    'customerName',
    'amount',
    'status',
    'date',
    'actions'
  ];
  pendingPayments: any[] = []; // Now storing Orders
  loading = false;

  // Statistics (Optional: Calculate from list or fetch separate)
  stats = {
    pendingApprovals: 0,
    totalRevenue: 0, // Maybe hide or calc
    successfulTransactions: 0,
    failedTransactions: 0
  };

  constructor(
    private orderService: OrderService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadPendingPayments();
  }

  loadPendingPayments(): void {
    this.loading = true;
    this.orderService.getOrders().subscribe({
      next: (orders) => {
        // Filter for Verification Pending OR Pay at Counter (Pending)
        this.pendingPayments = orders.filter(o => {
          const needsVerify = o.paymentStatus === 'VERIFICATION_PENDING';
          const payAtCounter = o.paymentMode === 'CASH' && o.status === 'PENDING';
          // Only show if NOT cancelled
          return (needsVerify || payAtCounter) && o.status !== 'CANCELLED';
        });

        this.stats.pendingApprovals = this.pendingPayments.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.loading = false;
      }
    });
  }

  approvePayment(order: any): void {
    if (confirm(`Verify & Confirm Order #${order.id}?`)) {
      this.orderService.verifyPayment(order.id).subscribe({
        next: () => {
          this.toastr.success('✅ Payment Verified! Order Confirmed.');
          this.loadPendingPayments();
        },
        error: (err) => {
          console.error('Error verifying order:', err);
          this.toastr.error('Failed to verify payment');
        }
      });
    }
  }

  rejectPayment(order: any): void {
    const reason = prompt('Reason for rejection (Cancels Order):');
    if (!reason) return;

    this.orderService.updateOrderStatus(order.id, 'CANCELLED').subscribe({
      next: () => {
        this.toastr.info('❌ Order Cancelled/Rejected.');
        this.loadPendingPayments();
      },
      error: (err) => {
        console.error('Error rejecting order:', err);
        this.toastr.error('Failed to reject order');
      }
    });
  }

  trackByPaymentId(_index: number, item: any): string {
    return item.id;
  }
}
