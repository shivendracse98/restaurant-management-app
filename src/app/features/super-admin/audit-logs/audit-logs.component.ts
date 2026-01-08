import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../services/super-admin.service';
import { AuditDetailsDialogComponent } from './audit-details-dialog.component';

@Component({
    selector: 'app-audit-logs',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatDialogModule,
        MatChipsModule,
        MatProgressSpinnerModule
    ],
    providers: [DatePipe],
    template: `
    <div class="audit-container">
      <div class="header">
        <h2>🛡️ Audit Logs</h2>
        <p>Track system changes and security events</p>
      </div>

      <!-- Filters -->
      <form [formGroup]="filterForm" class="filters-row">
        <mat-form-field appearance="outline">
          <mat-label>Entity Type</mat-label>
          <mat-select formControlName="entityType">
            <mat-option value="">All</mat-option>
            <mat-option value="SYSTEM_CONFIG">System Config</mat-option>
            <mat-option value="TENANT">Tenant</mat-option>
            <mat-option value="GLOBAL_SETTINGS">Global Settings</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Action</mat-label>
          <mat-select formControlName="action">
             <mat-option value="">All</mat-option>
             <mat-option value="UPDATE_SETTING">Update Setting</mat-option>
             <mat-option value="CREATE">Create</mat-option>
             <mat-option value="DELETE">Delete</mat-option>
             <mat-option value="SUSPEND_TENANT">Suspend Tenant</mat-option>
             <mat-option value="REACTIVATE_TENANT">Reactivate Tenant</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Performed By</mat-label>
          <input matInput formControlName="performedBy" placeholder="Email/User">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date Range</mat-label>
          <mat-date-range-input [rangePicker]="picker">
            <input matStartDate formControlName="fromDate" placeholder="Start date">
            <input matEndDate formControlName="toDate" placeholder="End date">
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-date-range-picker #picker></mat-date-range-picker>
        </mat-form-field>

        <button mat-raised-button color="primary" (click)="applyFilters()">Search</button>
        <button mat-button (click)="resetFilters()">Reset</button>
      </form>

      <!-- Loading Spinner -->
      <div *ngIf="loading" class="spinner-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Data Table -->
      <div class="table-container mat-elevation-z2" [class.hidden]="loading">
        <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSortChange($event)">

          <!-- Changed At Column -->
          <ng-container matColumnDef="changedAt">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Time </th>
            <td mat-cell *matCellDef="let row"> {{ row.changedAt | date:'short' }} </td>
          </ng-container>

          <!-- Performed By Column -->
          <ng-container matColumnDef="performedBy">
            <th mat-header-cell *matHeaderCellDef> User </th>
            <td mat-cell *matCellDef="let row"> {{ row.performedBy }} </td>
          </ng-container>

          <!-- Action Column -->
          <ng-container matColumnDef="action">
            <th mat-header-cell *matHeaderCellDef> Action </th>
            <td mat-cell *matCellDef="let row">
              <span class="action-badge" [class]="row.action | lowercase">{{ row.action }}</span>
            </td>
          </ng-container>

          <!-- Entity Column -->
          <ng-container matColumnDef="entityType">
            <th mat-header-cell *matHeaderCellDef> Entity </th>
            <td mat-cell *matCellDef="let row"> 
                <span class="entity-text">{{ row.entityType }}</span>
                <span class="entity-id-sub">{{ row.entityId }}</span>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Status </th>
            <td mat-cell *matCellDef="let row">
              <mat-chip-option [color]="row.status === 'SUCCESS' ? 'accent' : 'warn'" selected>
                {{ row.status }}
              </mat-chip-option>
            </td>
          </ng-container>

          <!-- Details Button Column -->
          <ng-container matColumnDef="details">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let row">
              <button mat-icon-button color="primary" (click)="viewDetails(row)" matTooltip="View Full Details">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <!-- No Data State -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" colspan="6">No logs found matching filter.</td>
          </tr>
        </table>

        <mat-paginator [length]="totalElements"
                       [pageSize]="pageSize"
                       [pageSizeOptions]="[10, 20, 50]"
                       (page)="onPageChange($event)">
        </mat-paginator>
      </div>
    </div>
  `,
    styles: [`
    .audit-container { padding: 24px; }
    .header { margin-bottom: 24px; h2 { margin: 0; color: #333; } p { margin: 0; color: #666; } }
    .filters-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .spinner-container { display: flex; justify-content: center; padding: 40px; }
    .hidden { display: none; }
    .table-container { background: #fff; border-radius: 8px; overflow: hidden; }
    table { width: 100%; }
    
    .action-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .action-badge.update_setting { background: #E3F2FD; color: #1565C0; }
    .action-badge.create { background: #E8F5E9; color: #2E7D32; }
    .action-badge.delete { background: #FFEBEE; color: #C62828; }
    .action-badge.suspend_tenant { background: #FFF3E0; color: #EF6C00; }
    
    .entity-text { display: block; font-weight: 500; }
    .entity-id-sub { display: block; font-size: 11px; color: #999; }
    
    tr.mat-row:hover { background-color: #f5f5f5; }
  `]
})
export class AuditLogsComponent implements OnInit {
    displayedColumns = ['changedAt', 'performedBy', 'action', 'entityType', 'status', 'details'];
    dataSource = new MatTableDataSource<any>([]);
    totalElements = 0;
    pageSize = 20;
    pageIndex = 0;
    loading = false;

    filterForm: FormGroup;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private superAdminService: SuperAdminService,
        private fb: FormBuilder,
        private dialog: MatDialog,
        private datePipe: DatePipe
    ) {
        this.filterForm = this.fb.group({
            entityType: [''],
            action: [''],
            performedBy: [''],
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

        // Format dates for backend
        const fromDate = filters.fromDate ? this.datePipe.transform(filters.fromDate, 'yyyy-MM-dd') : null;
        const toDate = filters.toDate ? this.datePipe.transform(filters.toDate, 'yyyy-MM-dd') : null;

        this.superAdminService.getAuditLogs(
            this.pageIndex,
            this.pageSize,
            filters.entityType,
            filters.action,
            filters.performedBy,
            fromDate,
            toDate
        ).subscribe({
            next: (data) => {
                this.dataSource.data = data.content;
                this.totalElements = data.totalElements;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load logs', err);
                this.loading = false;
            }
        });
    }

    onPageChange(event: PageEvent) {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        this.loadLogs();
    }

    onSortChange(sort: Sort) {
        // Backend sort support could be added here
        // For now we sort current page or reload with sort param
        this.loadLogs();
    }

    applyFilters() {
        this.pageIndex = 0; // Reset to first page
        this.loadLogs();
    }

    resetFilters() {
        this.filterForm.reset();
        this.applyFilters();
    }

    viewDetails(row: any) {
        this.dialog.open(AuditDetailsDialogComponent, {
            width: '600px',
            data: row
        });
    }
}
