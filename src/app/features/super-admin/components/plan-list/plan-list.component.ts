import { Component, OnInit } from '@angular/core';
import { SuperAdminService } from '../../services/super-admin.service';
import { MatDialog } from '@angular/material/dialog';
import { PlanFormComponent } from '../plan-form/plan-form.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-plan-list',
    templateUrl: './plan-list.component.html',
    styleUrls: ['./plan-list.component.scss']
})
export class PlanListComponent implements OnInit {
    plans: any[] = [];
    displayedColumns: string[] = ['sortOrder', 'name', 'price', 'features', 'status', 'actions'];

    featureMap: { [key: number]: string } = {
        1: 'Analytics',
        2: 'Multi-User',
        4: 'API',
        8: 'Branding',
        16: 'Delivery'
    };

    constructor(
        private superAdminService: SuperAdminService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.loadPlans();
    }

    loadPlans() {
        this.superAdminService.getAdminPlans().subscribe({
            next: (data) => this.plans = data,
            error: (err) => console.error('Failed to load plans', err)
        });
    }

    getFeatureNames(mask: number): string {
        const features: string[] = [];
        Object.keys(this.featureMap).forEach(key => {
            const bit = parseInt(key);
            if ((mask & bit) === bit) {
                features.push(this.featureMap[bit]);
            }
        });
        return features.join(', ');
    }

    openPlanForm(plan?: any) {
        const dialogRef = this.dialog.open(PlanFormComponent, {
            width: '600px',
            data: plan || {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) this.loadPlans();
        });
    }

    toggleStatus(plan: any) {
        if (confirm(`Are you sure you want to ${plan.isActive ? 'deactivate' : 'activate'} ${plan.name}?`)) {
            this.superAdminService.togglePlanStatus(plan.id).subscribe({
                next: () => {
                    this.snackBar.open('Status updated', 'Close', { duration: 3000 });
                    this.loadPlans();
                },
                error: () => this.snackBar.open('Failed to update status', 'Close', { duration: 3000 })
            });
        }
    }
}
