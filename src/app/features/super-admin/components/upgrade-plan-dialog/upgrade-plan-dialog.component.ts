import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SuperAdminService } from '../../services/super-admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-upgrade-plan-dialog',
    templateUrl: './upgrade-plan-dialog.component.html',
    styleUrls: ['./upgrade-plan-dialog.component.scss']
})
export class UpgradePlanDialogComponent implements OnInit {
    plans: any[] = [];
    selectedPlanSlug: string = '';
    loading = false;

    constructor(
        public dialogRef: MatDialogRef<UpgradePlanDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { groupId: string, currentPlanId: string },
        private superAdminService: SuperAdminService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        // Fetch user-facing plans (or admin plans if we want to include hidden ones)
        // Using public plans is safer as it only shows what's available for sale.
        this.superAdminService.getPublicPlans().subscribe({
            next: (data) => {
                this.plans = data;
                // Pre-select if possible, or leave empty
            },
            error: (err) => console.error('Failed to load plans', err)
        });
    }

    onSubmit() {
        if (!this.selectedPlanSlug) return;

        this.loading = true;
        this.superAdminService.upgradeGroupPlan(this.data.groupId, this.selectedPlanSlug).subscribe({
            next: () => {
                this.snackBar.open('Plan changed successfully', 'Close', { duration: 3000 });
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.snackBar.open('Failed to change plan', 'Close', { duration: 3000 });
                this.loading = false;
            }
        });
    }
}
