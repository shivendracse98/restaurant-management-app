import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { ConfigService } from '../../../core/services/config.service';
import { Order } from '../../../models/order.model';
import { forkJoin } from 'rxjs';

@Component({
    selector: 'app-invoice-print',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="invoice-container" *ngIf="order && config">
      <!-- HEADER -->
      <div class="header">
        <div class="logo-section" *ngIf="config.logoUrl">
          <img [src]="config.logoUrl" alt="Logo" class="logo">
        </div>
        <div class="restaurant-info">
          <h1>{{ config.restaurantName }}</h1>
          <p>{{ config.restaurantAddress }}</p>
          <p>Phone: {{ config.restaurantContact }}</p>
          <p *ngIf="config.gstIn"><strong>GSTIN:</strong> {{ config.gstIn }}</p>
          <p *ngIf="config.fssaiLicense"><strong>FSSAI:</strong> {{ config.fssaiLicense }}</p>
        </div>
      </div>

      <div class="divider"></div>

      <!-- INVOICE META -->
      <div class="invoice-meta">
        <h2 class="text-center">TAX INVOICE</h2>
        <div class="flex-row">
          <span><strong>Invoice No:</strong> #{{ order.id }}</span>
          <span><strong>Date:</strong> {{ order.createdAt | date:'medium' }}</span>
        </div>
        <div class="flex-row" *ngIf="order.customerName">
            <span><strong>Customer:</strong> {{ order.customerName }}</span>
            <span *ngIf="order.customerPhone"><strong>Ph:</strong> {{ order.customerPhone }}</span>
        </div>
         <div class="flex-row">
          <span><strong>Order Type:</strong> {{ order.orderType }}</span>
          <span *ngIf="order.tableNumber"><strong>Table:</strong> {{ order.tableNumber }}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- ITEMS TABLE -->
      <table class="items-table">
        <thead>
          <tr>
            <th class="text-left">Item</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of order.items">
            <td>
                {{ item.name }}
                <div *ngIf="config.isGstRegistered" class="text-xs text-muted">HSN: {{ item.hsnCode || 'N/A' }}</div>
            </td>
            <td class="text-center">{{ item.qty }}</td>
            <td class="text-right">{{ item.price | number:'1.2-2' }}</td>
            <td class="text-right">{{ (item.price! * item.qty!) | number:'1.2-2' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="divider"></div>

      <!-- TOTALS -->
      <div class="totals-section">
        <div class="row">
            <span>Subtotal:</span>
            <span>{{ order.subtotal | number:'1.2-2' }}</span>
        </div>
        
        <div *ngIf="config.isGstRegistered">
            <div class="row text-muted">
                <span>CGST (2.5%):</span>
                <span>{{ (order.cgst || 0) | number:'1.2-2' }}</span>
            </div>
            <div class="row text-muted">
                <span>SGST (2.5%):</span>
                <span>{{ (order.sgst || 0) | number:'1.2-2' }}</span>
            </div>
        </div>

        <div class="divider-dashed"></div>

        <div class="row grand-total">
            <span>GRAND TOTAL:</span>
            <span>₹{{ order.grandTotal | number:'1.2-2' }}</span>
        </div>
      </div>

      <div class="footer text-center mt-4">
        <p>Thank you for dining with us!</p>
        <p class="text-xs">This is a computer generated invoice.</p>
      </div>

    </div>

    <div *ngIf="!order" class="loading">
        Loading Invoice...
    </div>
  `,
    styles: [`
    /* GLOBAL STYLES FOR SCREEN & PRINT */
    .invoice-container {
        font-family: 'Courier New', Courier, monospace; /* Monospace for Thermal Receipt feel */
        max-width: 80mm; /* Standard Thermal Width */
        margin: 0 auto;
        padding: 10px;
        background: white;
        color: black;
    }

    .header { text-align: center; margin-bottom: 10px; }
    .logo { max-width: 60px; max-height: 60px; margin-bottom: 5px; }
    .restaurant-info h1 { font-size: 1.2em; margin: 0; font-weight: bold; }
    .restaurant-info p { margin: 2px 0; font-size: 0.8em; }

    .divider { border-bottom: 1px solid black; margin: 10px 0; }
    .divider-dashed { border-bottom: 1px dashed black; margin: 5px 0; }

    .invoice-meta { margin-bottom: 10px; }
    .invoice-meta h2 { font-size: 1em; text-decoration: underline; margin: 5px 0; }
    .flex-row { display: flex; justify-content: space-between; font-size: 0.8em; margin-bottom: 2px; }

    .items-table { width: 100%; font-size: 0.85em; border-collapse: collapse; }
    .items-table th { border-bottom: 1px solid black; padding: 5px 0; }
    .items-table td { padding: 4px 0; vertical-align: top; }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-xs { font-size: 0.7em; }
    .text-muted { color: #555; }

    .totals-section { font-size: 0.9em; margin-top: 10px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .grand-total { font-weight: bold; font-size: 1.1em; margin-top: 5px; }

    .footer { margin-top: 20px; font-size: 0.8em; }

    .loading { text-align: center; padding: 50px; }

    /* PRINT SPECIFIC */
    @media print {
        body * { visibility: hidden; }
        .invoice-container, .invoice-container * { visibility: visible; }
        .invoice-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
        @page { margin: 0; size: auto; } /* Remove browser headers/footers */
    }
  `]
})
export class InvoicePrintComponent implements OnInit {
    orderId: string | null = null;
    order: Order | null = null;
    config: any = null;

    private route = inject(ActivatedRoute);
    private orderService = inject(OrderService);
    private configService = inject(ConfigService);

    ngOnInit() {
        this.orderId = this.route.snapshot.paramMap.get('id');
        if (this.orderId) {
            this.loadData(this.orderId);
        }
    }

    loadData(id: string) {
        forkJoin({
            order: this.orderService.getOrder(+id), // Cast to number
            config: this.configService.getPaymentConfig()
        }).subscribe({
            next: (data) => {
                this.order = data.order;
                this.config = data.config;

                // Auto-print after a short delay to ensure render
                setTimeout(() => {
                    window.print();
                }, 500);
            },
            error: (err) => console.error('Failed to load invoice data', err)
        });
    }
}
