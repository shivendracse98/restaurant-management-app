import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService, BillingDashboardStats } from '../../../../core/services/billing.service';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-billing-dashboard',
    standalone: true,
    imports: [CommonModule, MatIconModule, RouterModule],
    templateUrl: './billing-dashboard.component.html',
    styleUrls: ['./billing-dashboard.component.scss']
})
export class BillingDashboardComponent implements OnInit {
    stats: BillingDashboardStats | null = null;
    loading = true;

    constructor(private billingService: BillingService) { }

    ngOnInit(): void {
        this.fetchStats();
    }

    fetchStats() {
        this.loading = true;
        this.billingService.getDashboardStats().subscribe({
            next: (data) => {
                this.stats = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load billing stats', err);
                this.loading = false;
            }
        });
    }

    downloadInvoice(id: number) {
        this.billingService.downloadInvoicePdf(id);
    }
}
