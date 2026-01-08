import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../../services/super-admin.service';

@Component({
    selector: 'app-invoice-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        CurrencyPipe,
        DatePipe,
        JsonPipe
    ],
    template: `
    <div class="detail-container">
        <!-- Breadcrumb / Header -->
        <div class="header-row">
            <a mat-button routerLink="../" color="primary">
                <mat-icon>arrow_back</mat-icon> Back to Invoices
            </a>
            <div class="actions">
                <button mat-stroked-button color="primary">
                    <mat-icon>email</mat-icon> Email
                </button>
                <button mat-raised-button color="primary">
                    <mat-icon>download</mat-icon> Download PDF
                </button>
            </div>
        </div>

        <div *ngIf="loading" class="spinner-container">
            <mat-spinner diameter="40"></mat-spinner>
        </div>

        <!-- The Paper Invoice -->
        <div *ngIf="!loading && invoice" class="invoice-paper mat-elevation-z4">
            
            <!-- Invoice Header -->
            <div class="inv-header">
                <div class="logo-area">
                    <h1>TasteTown</h1>
                    <span class="platform-subtitle">Restaurant Platform</span>
                </div>
                <div class="inv-meta">
                    <h2>INVOICE</h2>
                    <div class="row">
                        <span class="label">Invoice #:</span>
                        <span class="val">{{ invoice.invoiceNumber || 'INV-' + invoice.id }}</span>
                    </div>
                    <div class="row">
                        <span class="label">Date:</span>
                        <span class="val">{{ invoice.createdAt | date:'mediumDate' }}</span>
                    </div>
                     <div class="row">
                        <span class="label">Due Date:</span>
                        <span class="val">{{ invoice.dueDate | date:'mediumDate' }}</span>
                    </div>
                    <div class="status" [class]="invoice.status">{{ invoice.status }}</div>
                </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Bill To / From -->
            <div class="inv-addresses">
                <div class="bill-from">
                    <h3>FROM</h3>
                    <p><strong>TasteTown Inc.</strong></p>
                    <p>123 Tech Park, Ivy Road</p>
                    <p>Bangalore, KA, 560001</p>
                    <p>support&#64;tastetown.com</p>
                </div>
                <div class="bill-to">
                    <h3>TO</h3>
                    <p><strong>{{ invoice.tenantGroupId || invoice.restaurantId }}</strong></p>
                    <p>(Tenant Address Info Placeholder)</p>
                    <p>Period: {{ invoice.billingPeriod }}</p>
                </div>
            </div>

            <!-- Line Items -->
            <div class="inv-items">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th class="right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Mock Item (Since we lack line items in entity for now) -->
                        <tr>
                            <td>Platform Subscription Fee</td>
                            <td>1</td>
                            <td class="right">{{ invoice.amount | currency:'INR' }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                         <tr>
                            <td colspan="2" class="right label">Subtotal</td>
                            <td class="right">{{ invoice.amount | currency:'INR' }}</td>
                        </tr>
                         <tr>
                            <td colspan="2" class="right label">Tax (0%)</td>
                            <td class="right">{{ 0 | currency:'INR' }}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="2" class="right label">TOTAL</td>
                            <td class="right">{{ invoice.amount | currency:'INR' }}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Payment Info -->
            <div class="payment-info" *ngIf="invoice.paymentMetadata">
                <h4>Payment Information</h4>
                <pre>{{ invoice.paymentMetadata }}</pre>
            </div>
            
            <div class="footer-notes">
                 <p>Thank you for your business!</p>
            </div>

        </div>
    </div>
  `,
    styles: [`
    .detail-container { padding: 24px; max-width: 900px; margin: 0 auto; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .actions { display: flex; gap: 8px; }
    .spinner-container { display: flex; justify-content: center; padding: 40px; }

    /* Paper Design */
    .invoice-paper { background: white; padding: 48px; min-height: 800px; position: relative; }
    
    .inv-header { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .logo-area h1 { margin: 0; font-size: 28px; color: #218090; letter-spacing: -1px; }
    .platform-subtitle { color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }

    .inv-meta { text-align: right; }
    .inv-meta h2 { margin: 0 0 16px; font-size: 24px; color: #e5e7eb; font-weight: 800; letter-spacing: 2px; }
    .inv-meta .row { margin-bottom: 4px; font-size: 14px; }
    .inv-meta .label { color: #6b7280; margin-right: 8px; }
    .inv-meta .val { font-weight: 600; }
    .status { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 12px; text-transform: uppercase; border: 2px solid currentColor; }
    .status.PAID { color: #047857; }
    .status.PENDING { color: #1e40af; }
    .status.FAILED { color: #b91c1c; }

    .inv-addresses { display: flex; justify-content: space-between; margin: 48px 0; }
    .inv-addresses h3 { font-size: 12px; text-transform: uppercase; color: #9ca3af; margin-bottom: 8px; }
    .inv-addresses p { margin: 0 0 4px; font-size: 14px; color: #374151; }

    .inv-items table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .inv-items th { text-align: left; padding: 12px 0; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-size: 13px; text-transform: uppercase; }
    .inv-items td { padding: 16px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .inv-items .right { text-align: right; }
    
    .inv-items tfoot td { border-bottom: none; }
    .inv-items tfoot .label { font-weight: 600; color: #6b7280; padding-right: 16px; }
    .total-row td { padding-top: 16px; font-size: 18px; font-weight: 700; color: #111827; border-top: 2px solid #111827; }

    .payment-info { background: #f9fafb; padding: 16px; border-radius: 4px; font-size: 12px; font-family: monospace; color: #4b5563; }
    .footer-notes { margin-top: 48px; text-align: center; color: #9ca3af; font-size: 13px; }
    
    @media print {
        .detail-container { padding: 0; margin: 0; max-width: none; }
        .header-row, .actions { display: none; }
        .invoice-paper { box-shadow: none; padding: 20px; }
    }
  `]
})
export class InvoiceDetailComponent implements OnInit {
    invoice: any = null;
    loading = true;

    constructor(
        private route: ActivatedRoute,
        private superAdminService: SuperAdminService
    ) { }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadInvoice(+id);
        }
    }

    loadInvoice(id: number) {
        this.loading = true;
        this.superAdminService.getInvoiceById(id).subscribe({
            next: (data) => {
                this.invoice = data;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }
}
