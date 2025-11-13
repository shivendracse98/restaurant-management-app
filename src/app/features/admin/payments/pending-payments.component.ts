import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { PaymentService, Payment, PaymentStats } from '../../../core/services/payment.service';

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
  pendingPayments: Payment[] = [];
  stats: PaymentStats | null = null;
  loading = false;

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadPendingPayments();
    this.paymentService.stats$.subscribe((stats) => {
      this.stats = stats;
    });
  }

  loadPendingPayments(): void {
    this.loading = true;
    this.paymentService.getPendingPayments().subscribe({
      next: (payments) => {
        this.pendingPayments = payments;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading payments:', err);
        this.loading = false;
      }
    });
  }

  approvePayment(payment: Payment): void {
    if (confirm(`Approve payment of ₹${payment.amount}?`)) {
      this.paymentService.approvePayment(payment.id, 'Admin').subscribe({
        next: () => {
          alert('Payment approved');
          this.loadPendingPayments();
        },
        error: (err) => {
          console.error('Error approving payment:', err);
          alert('Failed to approve payment');
        }
      });
    }
  }

  rejectPayment(payment: Payment): void {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    this.paymentService.rejectPayment(payment.id, reason).subscribe({
      next: () => {
        alert('Payment rejected');
        this.loadPendingPayments();
      },
      error: (err) => {
        console.error('Error rejecting payment:', err);
        alert('Failed to reject payment');
      }
    });
  }

  trackByPaymentId(_index: number, payment: Payment): string {
    return payment.id;
  }
}
