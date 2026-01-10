import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../../services/super-admin.service';
import { TenantGroup } from '../../models/tenant-group.model';
import { GroupAnalytics, RestaurantPerformance } from '../../models/group-analytics.model';
import { AddRestaurantDialogComponent } from '../add-restaurant-dialog/add-restaurant-dialog.component';
import { TenantGroupDialogComponent } from '../tenant-group-dialog/tenant-group-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UpgradePlanDialogComponent } from '../../components/upgrade-plan-dialog/upgrade-plan-dialog.component';

@Component({
    selector: 'app-tenant-group-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatTabsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
        MatListModule,
        MatTableModule,
        MatSortModule,
        MatProgressSpinnerModule,
        MatTooltipModule
    ],
    templateUrl: './tenant-group-detail.component.html',
    styleUrls: ['./tenant-group-detail.component.css']
})
export class TenantGroupDetailComponent implements OnInit {
    groupId: string | null = null;
    group: TenantGroup | null = null;
    isLoading: boolean = false;

    // Placeholders
    linkedRestaurants: any[] = [];
    analytics: GroupAnalytics | null = null;
    invoices: any[] = [];

    // Performance Table
    performanceDataSource = new MatTableDataSource<RestaurantPerformance>([]);
    performanceColumns: string[] = ['name', 'revenue', 'orders', 'aov'];

    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private route: ActivatedRoute,
        private superAdminService: SuperAdminService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.groupId = this.route.snapshot.paramMap.get('id');
        if (this.groupId) {
            this.loadGroup();
        }
    }

    loadGroup(): void {
        this.isLoading = true;
        if (this.groupId) {
            this.superAdminService.getTenantGroup(this.groupId).subscribe({
                next: (data) => {
                    this.group = data;
                    this.loadRestaurants();
                    this.loadAnalytics();
                    this.loadInvoices();
                },
                error: (err) => {
                    console.error('Error loading group', err);
                    this.isLoading = false;
                }
            });
        }
    }

    loadRestaurants(): void {
        if (!this.groupId) return;
        this.superAdminService.getGroupRestaurants(this.groupId).subscribe({
            next: (data) => {
                this.linkedRestaurants = data;
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error loading restaurants', err);
                this.isLoading = false;
            }
        });
    }

    loadAnalytics(): void {
        if (!this.groupId) return;
        this.superAdminService.getGroupAnalytics(this.groupId).subscribe({
            next: (data: GroupAnalytics) => {
                this.analytics = data;
                if (data.breakdown) {
                    this.performanceDataSource.data = data.breakdown;
                    // Fix sort timing
                    setTimeout(() => {
                        this.performanceDataSource.sort = this.sort;
                    });
                }
            },
            error: (err) => console.error('Error loading analytics', err)
        });
    }

    loadInvoices(): void {
        if (!this.groupId) return;
        this.superAdminService.getGroupInvoices(this.groupId).subscribe({
            next: (data) => this.invoices = data,
            error: (err) => console.error('Error loading invoices', err)
        });
    }

    openAddRestaurantDialog(): void {
        if (!this.groupId) return;

        const dialogRef = this.dialog.open(AddRestaurantDialogComponent, {
            width: '500px',
            data: {
                groupId: this.groupId,
                existingRestaurantIds: this.linkedRestaurants.map(r => r.tenantId)
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadGroup();
            }
        });
    }

    unlinkRestaurant(restaurantId: string): void {
        if (!this.groupId) return;

        if (confirm('Are you sure you want to remove this restaurant from the group?')) {
            this.superAdminService.removeRestaurantFromGroup(this.groupId, restaurantId).subscribe({
                next: () => {
                    this.loadGroup();
                    this.loadAnalytics(); // Refresh analytics too
                },
                error: (err) => {
                    alert('Failed to remove restaurant');
                }
            });
        }
    }

    openEditGroupDialog(): void {
        if (!this.group) return;

        const dialogRef = this.dialog.open(TenantGroupDialogComponent, {
            width: '600px',
            data: { mode: 'edit', group: this.group }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadGroup();
            }
        });
    }

    openUpgradePlanDialog(): void {
        if (!this.group || !this.groupId) return;

        const dialogRef = this.dialog.open(UpgradePlanDialogComponent, {
            width: '500px',
            data: {
                groupId: this.groupId,
                currentPlanId: this.group.planId
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadGroup(); // Refresh to show new Plan details
            }
        });
    }

    // --- Export Logic ---

    exportReport(): void {
        if (!this.analytics || !this.analytics.breakdown || this.analytics.breakdown.length === 0) {
            alert('No data to export.');
            return;
        }

        const data = this.analytics.breakdown;
        const csvRows = [];

        // Headers
        const headers = ['Restaurant', 'Branch ID', 'Revenue', 'Orders', 'AOV'];
        csvRows.push(headers.join(','));

        // Rows
        for (const row of data) {
            const values = [
                `"${row.name}"`, // Quote strings
                row.restaurantId,
                row.revenue.toFixed(2),
                row.orders,
                row.averageOrderValue.toFixed(2)
            ];
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `performance_breakdown_${this.groupId}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    downloadInvoice(invoiceId: number): void {
        this.superAdminService.downloadInvoicePdf(invoiceId).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice_${invoiceId}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => {
                console.error('Download failed', err);
                alert('Failed to download invoice. Please try again.');
            }
        });
    }
}
