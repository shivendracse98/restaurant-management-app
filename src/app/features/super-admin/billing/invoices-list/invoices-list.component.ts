import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../../services/super-admin.service';

@Component({
    selector: 'app-invoices-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        CurrencyPipe
    ],
    providers: [DatePipe],
    template: `
    <div class="invoices-layout">
        <!-- Sidebar Filters -->
        <div class="filters-sidebar">
            <h3>Filters</h3>
            <form [formGroup]="filterForm" (ngSubmit)="applyFilters()">
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Status</mat-label>
                    <mat-select formControlName="status">
                        <mat-option value="">All Statuses</mat-option>
                        <mat-option value="PAID">Paid</mat-option>
                        <mat-option value="PENDING">Pending</mat-option>
                        <mat-option value="FAILED">Failed</mat-option>
                        <mat-option value="CANCELLED">Cancelled</mat-option>
                    </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Tenant ID / Group ID</mat-label>
                    <input matInput formControlName="tenantId" placeholder="e.g. delicious-bites">
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Date Range</mat-label>
                    <mat-date-range-input [rangePicker]="picker">
                        <input matStartDate formControlName="fromDate" placeholder="Start date">
                        <input matEndDate formControlName="toDate" placeholder="End date">
                    </mat-date-range-input>
                    <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                    <mat-date-range-picker #picker></mat-date-range-picker>
                </mat-form-field>

                <div class="filter-actions">
                    <button mat-raised-button color="primary" type="submit">Apply</button>
                    <button mat-button type="button" (click)="resetFilters()">Reset</button>
                </div>
            </form>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <div class="header">
                <h2>All Invoices</h2>
                 <button mat-stroked-button color="primary">
                    <mat-icon>download</mat-icon> Export CSV
                </button>
            </div>

            <!-- Loading Spinner -->
            <div *ngIf="loading" class="spinner-container">
                <mat-spinner diameter="40"></mat-spinner>
            </div>

            <div class="table-container mat-elevation-z1" [class.hidden]="loading">
                <table mat-table [dataSource]="dataSource" matSort>

                     <!-- Invoice # -->
                    <ng-container matColumnDef="invoiceNumber">
                        <th mat-header-cell *matHeaderCellDef mat-sort-header> Invoice # </th>
                        <td mat-cell *matCellDef="let row"> 
                            <a [routerLink]="['.', row.id]" class="invoice-link">
                                {{ row.invoiceNumber || 'INV-' + row.id }}
                            </a>
                        </td>
                    </ng-container>

                     <!-- Tenant -->
                    <ng-container matColumnDef="tenant">
                        <th mat-header-cell *matHeaderCellDef> Tenant </th>
                        <td mat-cell *matCellDef="let row"> 
                            <div class="tenant-info">
                                <span class="id">{{ row.restaurantId || row.tenantGroupId }}</span>
                            </div>
                        </td>
                    </ng-container>

                     <!-- Period -->
                    <ng-container matColumnDef="period">
                        <th mat-header-cell *matHeaderCellDef> Period </th>
                        <td mat-cell *matCellDef="let row"> {{ row.billingPeriod }} </td>
                    </ng-container>

                     <!-- Amount -->
                    <ng-container matColumnDef="amount">
                        <th mat-header-cell *matHeaderCellDef mat-sort-header> Amount </th>
                        <td mat-cell *matCellDef="let row"> {{ row.amount | currency:'INR' }} </td>
                    </ng-container>

                     <!-- Created At -->
                    <ng-container matColumnDef="createdAt">
                        <th mat-header-cell *matHeaderCellDef mat-sort-header> Created </th>
                        <td mat-cell *matCellDef="let row"> {{ row.createdAt | date:'mediumDate' }} </td>
                    </ng-container>

                     <!-- Status -->
                    <ng-container matColumnDef="status">
                        <th mat-header-cell *matHeaderCellDef> Status </th>
                        <td mat-cell *matCellDef="let row">
                            <span class="status-badge" [class]="row.status | lowercase">
                                {{ row.status }}
                            </span>
                        </td>
                    </ng-container>

                    <!-- Actions -->
                    <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef> Actions </th>
                        <td mat-cell *matCellDef="let row">
                             <a mat-icon-button color="primary" [routerLink]="['.', row.id]">
                                <mat-icon>visibility</mat-icon>
                             </a>
                        </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                    
                    <tr class="mat-row" *matNoDataRow>
                        <td class="mat-cell" colspan="7">No invoices found.</td>
                    </tr>
                </table>

                <mat-paginator [length]="totalElements" 
                               [pageSize]="pageSize" 
                               [pageSizeOptions]="[10, 20, 50]"
                               (page)="onPageChange($event)">
                </mat-paginator>
            </div>
        </div>
    </div>
  `,
    styles: [`
    .invoices-layout { display: flex; gap: 24px; padding: 24px; max-width: 1400px; margin: 0 auto; align-items: flex-start; }
    
    /* Sidebar */
    .filters-sidebar { width: 280px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: sticky; top: 24px; flex-shrink: 0; }
    .filters-sidebar h3 { margin-top: 0; margin-bottom: 20px; color: #374151; font-size: 16px; font-weight: 600; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .filter-actions { display: flex; gap: 8px; margin-top: 8px; }

    /* Main Content */
    .main-content { flex: 1; min-width: 0; } /* min-width 0 prevents table overflow issues */
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header h2 { margin: 0; font-size: 24px; color: #1f2937; }

    .table-container { background: white; border-radius: 8px; overflow: hidden; }
    table { width: 100%; }
    
    .spinner-container { display: flex; justify-content: center; padding: 40px; }
    .hidden { display: none; }

    /* Badges & Links */
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-badge.paid { background: #d1fae5; color: #047857; }
    .status-badge.pending { background: #dbeafe; color: #1e40af; }
    .status-badge.failed { background: #fee2e2; color: #b91c1c; }
    .status-badge.cancelled { background: #f3f4f6; color: #374151; }

    .invoice-link { color: #218090; font-weight: 600; text-decoration: none; }
    .invoice-link:hover { text-decoration: underline; }
    
    .tenant-info .id { font-family: monospace; color: #4b5563; font-size: 13px; }

    @media (max-width: 1024px) {
        .invoices-layout { flex-direction: column; }
        .filters-sidebar { width: 100%; position: static; }
    }
  `]
})
export class InvoicesListComponent implements OnInit {
    displayedColumns = ['invoiceNumber', 'tenant', 'period', 'amount', 'createdAt', 'status', 'actions'];
    dataSource = new MatTableDataSource<any>([]);
    totalElements = 0;
    pageSize = 20;
    pageIndex = 0;
    loading = false;
    filterForm: FormGroup;

    constructor(
        private superAdminService: SuperAdminService,
        private fb: FormBuilder,
        private datePipe: DatePipe
    ) {
        this.filterForm = this.fb.group({
            status: [''],
            tenantId: [''],
            fromDate: [null],
            toDate: [null]
        });
    }

    ngOnInit() {
        this.loadLogs();
    }

    loadLogs() {
        this.loading = true;
        const filters = this.filterForm.value;
        const fromDate = filters.fromDate ? this.datePipe.transform(filters.fromDate, 'yyyy-MM-dd') : null;
        const toDate = filters.toDate ? this.datePipe.transform(filters.toDate, 'yyyy-MM-dd') : null;

        this.superAdminService.getInvoices(
            this.pageIndex,
            this.pageSize,
            filters.status,
            filters.tenantId,
            fromDate,
            toDate
        ).subscribe({
            next: (data) => {
                this.dataSource.data = data.content;
                this.totalElements = data.totalElements;
                this.loading = false;
            },
            error: (err) => {
                console.error(err);
                this.loading = false;
            }
        });
    }

    onPageChange(event: any) {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        this.loadLogs();
    }

    applyFilters() {
        this.pageIndex = 0;
        this.loadLogs();
    }

    resetFilters() {
        this.filterForm.reset();
        this.applyFilters();
    }
}
