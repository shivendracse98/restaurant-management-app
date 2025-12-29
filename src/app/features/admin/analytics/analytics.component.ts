import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AnalyticsPoint } from '../../../core/services/admin.service';

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './analytics.component.html',
    styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
    periods = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
    currentPeriod = 'Daily';
    data: AnalyticsPoint[] = [];
    loading = false;
    maxRevenue = 0;

    constructor(private adminService: AdminService) { }

    ngOnInit(): void {
        this.loadData();
    }

    setPeriod(period: string): void {
        if (this.currentPeriod === period) return;
        this.currentPeriod = period;
        this.loadData();
    }

    loadData(): void {
        this.loading = true;
        this.adminService.getAnalytics(this.currentPeriod.toLowerCase()).subscribe({
            next: (points) => {
                this.data = points;
                this.maxRevenue = Math.max(...points.map(p => p.revenue), 100); // 100 min to avoid div by zero
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load analytics', err);
                this.loading = false;
            }
        });
    }

    getBarHeight(revenue: number): string {
        if (this.maxRevenue === 0) return '0%';
        const percentage = (revenue / this.maxRevenue) * 100;
        return `${Math.max(percentage, 2)}%`; // Min 2% height for visibility
    }
}
