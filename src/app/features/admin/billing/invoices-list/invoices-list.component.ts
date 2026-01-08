import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BillingService, InvoiceSummary } from '../../../../core/services/billing.service';

@Component({
    selector: 'app-invoices-list',
    standalone: true,
    imports: [CommonModule, MatIconModule, RouterModule],
    templateUrl: './invoices-list.component.html',
    styleUrls: ['./invoices-list.component.scss']
})
export class InvoicesListComponent implements OnInit {
    invoices: InvoiceSummary[] = [];
    loading = true;

    constructor(private billingService: BillingService) { }

    ngOnInit(): void {
        this.fetchInvoices();
    }

    fetchInvoices() {
        this.loading = true;
        this.billingService.getAllInvoices().subscribe({
            next: (data) => {
                this.invoices = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load invoices', err);
                this.loading = false;
            }
        });
    }

    downloadInvoice(id: number) {
        this.billingService.downloadInvoicePdf(id);
    }
}
