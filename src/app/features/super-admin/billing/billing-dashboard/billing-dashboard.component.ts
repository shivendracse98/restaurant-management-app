import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../../services/super-admin.service';

@Component({
    selector: 'app-billing-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        CurrencyPipe
    ],
    template: `
    <div class="dashboard-container">
      <!-- Header -->
      <div class="header-row">
        <div>
          <h1>Billing Dashboard</h1>
          <p class="subtitle">Overview of revenue, invoices, and subscription health</p>
        </div>
        <div class="actions">
          <button mat-raised-button color="primary" routerLink="/super-admin/billing/invoices">
            <mat-icon>receipt</mat-icon> View All Invoices
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="spinner-container">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <div *ngIf="!loading && stats" class="dashboard-content">
        <!-- Metrics Cards -->
        <div class="metrics-grid">
          <!-- Total Revenue -->
          <mat-card class="metric-card teal-card">
            <mat-card-content>
              <div class="metric-header">
                <span class="label">Total Revenue (All Time)</span>
                <mat-icon>payments</mat-icon>
              </div>
              <div class="value">{{ stats.totalRevenue | currency:'INR' }}</div>
              <div class="trend">
                <mat-icon class="up">trending_up</mat-icon>
                <span>Across {{ stats.totalInvoices }} invoices</span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Pending Payments -->
          <mat-card class="metric-card blue-card">
            <mat-card-content>
              <div class="metric-header">
                <span class="label">Pending Payments</span>
                <mat-icon>hourglass_empty</mat-icon>
              </div>
              <div class="value">{{ stats.pendingAmount | currency:'INR' }}</div>
              <div class="sub-value">{{ stats.pendingCount }} Invoices Pending</div>
            </mat-card-content>
          </mat-card>

          <!-- Overdue -->
          <mat-card class="metric-card red-card">
            <mat-card-content>
              <div class="metric-header">
                <span class="label">Overdue</span>
                <mat-icon>warning</mat-icon>
              </div>
              <div class="value">{{ stats.overdueCount }}</div>
              <div class="sub-value">Requires Attention</div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Recent Invoices & Quick Actions Section -->
        <div class="lists-grid">
          <div class="recent-invoices section">
            <h3>Recent Invoices</h3>
            <div class="table-container mat-elevation-z1">
              <table mat-table [dataSource]="recentInvoices">
                
                <!-- Invoice # -->
                <ng-container matColumnDef="invoiceNumber">
                  <th mat-header-cell *matHeaderCellDef> Invoice # </th>
                  <td mat-cell *matCellDef="let row"> {{ row.invoiceNumber || 'INV-' + row.id }} </td>
                </ng-container>

                <!-- Amount -->
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef> Amount </th>
                  <td mat-cell *matCellDef="let row"> {{ row.amount | currency:'INR' }} </td>
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

                <!-- Action -->
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef> </th>
                  <td mat-cell *matCellDef="let row">
                    <a mat-icon-button color="primary" [routerLink]="['/super-admin/billing/invoices', row.id]">
                      <mat-icon>visibility</mat-icon>
                    </a>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['invoiceNumber', 'amount', 'status', 'actions']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['invoiceNumber', 'amount', 'status', 'actions'];"></tr>
              </table>
              <div class="empty-state" *ngIf="recentInvoices.length === 0">
                No invoices found.
              </div>
            </div>
          </div>

          <!-- Quick Actions / Info -->
          <div class="quick-actions section">
            <h3>Quick Actions</h3>
            <div class="action-buttons">
              <button mat-stroked-button class="full-width">
                <mat-icon>download</mat-icon> Download Monthly Report
              </button>
              <button mat-stroked-button class="full-width">
                 <mat-icon>settings</mat-icon> Configure Gateways
              </button>
            </div>

             <div class="info-box">
                <h4><mat-icon>info</mat-icon> Plan Distribution</h4>
                <p>Most revenue comes from <strong>Professional</strong> plans.</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  `,
    styles: [`
    .dashboard-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    h1 { margin: 0; font-size: 28px; color: #1f2937; }
    .subtitle { color: #6b7280; margin: 4px 0 0; }
    
    .spinner-container { display: flex; justify-content: center; padding: 40px; }

    /* Metrics Grid */
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
    
    .metric-card { height: 100%; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); color: white; }
    .metric-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; opacity: 0.9; }
    .metric-header .label { font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
    .value { font-size: 32px; font-weight: 700; margin-bottom: 8px; font-family: 'Courier New', monospace; }
    .trend { display: flex; align-items: center; font-size: 13px; opacity: 0.9; gap: 4px; }
    .sub-value { font-size: 14px; opacity: 0.85; }

    .teal-card { background: linear-gradient(135deg, #218090 0%, #155e6b 100%); }
    .blue-card { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); }
    .red-card { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); }

    /* Recent Invoices Table */
    .lists-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
    .section h3 { font-size: 18px; font-weight: 600; color: #374151; margin-bottom: 16px; }
    
    .table-container { background: white; border-radius: 8px; overflow: hidden; }
    table { width: 100%; }
    th.mat-header-cell { background: #f9fafb; color: #6b7280; font-weight: 600; font-size: 12px; text-transform: uppercase; }
    
    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-badge.paid { background: #d1fae5; color: #047857; }
    .status-badge.pending { background: #dbeafe; color: #1e40af; }
    .status-badge.failed { background: #fee2e2; color: #b91c1c; }
    .status-badge.overdue { background: #fee2e2; color: #b91c1c; }

    .empty-state { padding: 32px; text-align: center; color: #6b7280; }

    /* Quick Actions */
    .action-buttons { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .full-width { width: 100%; justify-content: flex-start; padding: 20px !important; }
    
    .info-box { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 16px; border-radius: 8px; }
    .info-box h4 { margin: 0 0 8px; display: flex; align-items: center; gap: 8px; font-size: 15px; }
    .info-box p { margin: 0; font-size: 13px; }

    @media (max-width: 768px) {
      .lists-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BillingDashboardComponent implements OnInit {
    stats: any = null;
    recentInvoices: any[] = [];
    loading = true;

    constructor(private superAdminService: SuperAdminService) { }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loading = true;

        // 1. Load Stats
        this.superAdminService.getBillingStats().subscribe({
            next: (data) => {
                this.stats = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load stats', err);
                this.loading = false;
            }
        });

        // 2. Load Recent Invoices (Page 0, Size 5)
        this.superAdminService.getInvoices(0, 5).subscribe({
            next: (data) => {
                this.recentInvoices = data.content;
            }
        });
    }
}
