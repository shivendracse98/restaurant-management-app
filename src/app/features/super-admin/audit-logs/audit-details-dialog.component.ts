import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-audit-details-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatDividerModule, MatIconModule],
    template: `
    <h2 mat-dialog-title>Audit Log Details</h2>
    <mat-dialog-content>
        <div class="detail-grid">
            <div class="label">Log ID:</div>
            <div class="value">{{ data.id }}</div>

            <div class="label">Timestamp:</div>
            <div class="value">{{ data.changedAt | date:'medium' }}</div>

            <div class="label">Action:</div>
            <div class="value action-text">{{ data.action }}</div>

            <div class="label">Performed By:</div>
            <div class="value">{{ data.performedBy }}</div>

            <div class="label">Status:</div>
            <div class="value" [class.error-text]="data.status !== 'SUCCESS'">{{ data.status }}</div>
            
            <ng-container *ngIf="data.status !== 'SUCCESS'">
                <div class="label">Error Message:</div>
                <div class="value error-text">{{ data.errorMessage }}</div>
            </ng-container>

            <mat-divider style="grid-column: 1 / -1; margin: 8px 0;"></mat-divider>

            <div class="label">Entity Type:</div>
            <div class="value">{{ data.entityType }}</div>
            
            <div class="label">Entity ID:</div>
            <div class="value code-font">{{ data.entityId }}</div>

            <!-- Diff Section -->
            <div class="full-width" *ngIf="data.oldValue || data.newValue">
                <h3>Change Diff</h3>
                <div class="diff-container">
                    <div class="diff-box old">
                        <strong>Old Value:</strong>
                        <pre>{{ data.oldValue || '(null)' }}</pre>
                    </div>
                    <div class="diff-box new">
                        <strong>New Value:</strong>
                        <pre>{{ data.newValue || '(null)' }}</pre>
                    </div>
                </div>
            </div>

            <!-- Meta Data -->
            <mat-divider style="grid-column: 1 / -1; margin: 8px 0;"></mat-divider>
            
            <div class="label">IP Address:</div>
            <div class="value">{{ data.ipAddress || 'N/A' }}</div>
            
            <div class="label">User Agent:</div>
            <div class="value small-text">{{ data.userAgent || 'N/A' }}</div>
        </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
    styles: [`
    .detail-grid { display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: baseline; }
    .label { font-weight: 500; color: #666; font-size: 13px; }
    .value { font-size: 14px; color: #333; word-break: break-all; }
    .full-width { grid-column: 1 / -1; }
    
    .code-font { font-family: monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 4px; }
    .action-text { font-weight: 600; color: #1976D2; }
    .error-text { color: #D32F2F; font-weight: 500; }
    .small-text { font-size: 12px; color: #888; }
    
    .diff-container { display: flex; gap: 16px; margin-top: 8px; }
    .diff-box { flex: 1; padding: 12px; border-radius: 6px; font-size: 13px; }
    .diff-box.old { background: #FFEBEE; border: 1px solid #FFCDD2; }
    .diff-box.new { background: #E8F5E9; border: 1px solid #C8E6C9; }
    pre { white-space: pre-wrap; margin: 4px 0 0 0; font-family: monospace; }
  `]
})
export class AuditDetailsDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<AuditDetailsDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { }
}
