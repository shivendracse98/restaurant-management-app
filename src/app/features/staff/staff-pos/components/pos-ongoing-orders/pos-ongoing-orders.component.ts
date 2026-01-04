import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pos-ongoing-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pos-ongoing-orders.component.html',
  styleUrls: ['./pos-ongoing-orders.component.scss']
})
export class PosOngoingOrdersComponent {
  // --- SIGNALS (Inputs) ---
  ongoingOrders = input.required<any[]>();
  isLoading = input<boolean>(false);

  // --- OUTPUTS ---
  verifyPayment = output<any>();
  markAsServed = output<any>();
  openPayment = output<any>();
  shareBill = output<any>();
  openEdit = output<any>();

  // --- Local State ---
  sortOption = signal('newest');

  // computed getter for sorted
  get sortedOrders(): any[] {
    const sorted = [...this.ongoingOrders()];
    const opt = this.sortOption();

    switch (opt) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'customer_asc':
        return sorted.sort((a, b) => (a.customerName || '').localeCompare(b.customerName || ''));
      case 'customer_desc':
        return sorted.sort((a, b) => (b.customerName || '').localeCompare(a.customerName || ''));
      default:
        return sorted;
    }
  }

  constructor() { }
}
