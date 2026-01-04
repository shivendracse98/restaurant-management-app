import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, AnalyticsPoint } from '../../../core/services/admin.service';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType, Chart, registerables } from 'chart.js';

Chart.register(...registerables); // Register all Chart.js components

@Component({
    selector: 'app-analytics',
    standalone: true,
    imports: [CommonModule, NgChartsModule],
    templateUrl: './analytics.component.html',
    styleUrls: ['./analytics.component.scss']
})
export class AnalyticsComponent implements OnInit {
    periods = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
    currentPeriod = 'Daily';
    loading = false;
    data: AnalyticsPoint[] = [];

    // KPI Stats
    summaryStats = {
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0
    };

    // Chart Config
    @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

    public barChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            line: {
                tension: 0.4 // Smooth curves
            },
            point: {
                radius: 4,
                hoverRadius: 6
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#2D3436',
                padding: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                displayColors: false,
                callbacks: {
                    label: (context) => `Revenue: ₹${context.parsed.y}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#636E72', font: { size: 11 } }
            },
            y: {
                beginAtZero: true,
                grid: { color: '#dfe6e9', drawTicks: false },
                ticks: {
                    color: '#636E72',
                    callback: (value) => '₹' + value
                }
            }
        }
    };

    public barChartType: ChartType = 'line';
    public barChartData: ChartData<'line'> = {
        labels: [],
        datasets: [
            {
                data: [],
                label: 'Revenue',
                borderColor: '#E67E22',
                backgroundColor: 'rgba(230, 126, 34, 0.2)',
                fill: true,
                borderWidth: 3
            }
        ]
    };

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
                this.processData(points);
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load analytics', err);
                this.loading = false;
            }
        });
    }

    processData(points: AnalyticsPoint[]) {
        this.data = points; // Store data for template check

        // Calculate Stats
        let revenue = 0;
        let orders = 0;

        points.forEach(p => {
            revenue += p.revenue;
            orders += p.orderCount;
        });

        this.summaryStats = {
            totalRevenue: revenue,
            totalOrders: orders,
            avgOrderValue: orders > 0 ? Math.round(revenue / orders) : 0
        };

        // Update Chart
        this.barChartData.labels = points.map(p => p.label);
        this.barChartData.datasets[0].data = points.map(p => p.revenue);

        if (this.chart) {
            this.chart.update();
        }
    }
}
