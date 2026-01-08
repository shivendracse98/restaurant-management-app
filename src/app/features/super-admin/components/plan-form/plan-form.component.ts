import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SuperAdminService } from '../../services/super-admin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-plan-form',
    templateUrl: './plan-form.component.html',
    styleUrls: ['./plan-form.component.scss']
})
export class PlanFormComponent implements OnInit {
    form: FormGroup;
    isEditMode = false;

    // Feature Bitmask Mapping
    features = [
        { name: 'Analytics Dashboard', value: 1, key: 'analytics' },
        { name: 'Multi-User Access', value: 2, key: 'multiUser' },
        { name: 'API Access', value: 4, key: 'api' },
        { name: 'Custom Branding', value: 8, key: 'branding' },
        { name: 'Delivery Management', value: 16, key: 'delivery' }
    ];

    constructor(
        private fb: FormBuilder,
        private superAdminService: SuperAdminService,
        private snackBar: MatSnackBar,
        public dialogRef: MatDialogRef<PlanFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.isEditMode = !!data && !!data.id;
        this.form = this.fb.group({
            name: ['', Validators.required],
            slug: [''],
            basePrice: [0, [Validators.required, Validators.min(0)]],
            sortOrder: [0, Validators.required],
            description: [''],
            // We'll manage features via manual checkbox binding or a FormArray, 
            // but simple boolean controls for each feature is easier for this scale.
            analytics: [false],
            multiUser: [false],
            api: [false],
            branding: [false],
            delivery: [false]
        });
    }

    ngOnInit(): void {
        if (this.isEditMode) {
            this.populateForm(this.data);
        }
    }

    populateForm(plan: any) {
        const mask = plan.featuresBitmask || 0;
        this.form.patchValue({
            name: plan.name,
            slug: plan.slug,
            basePrice: plan.basePrice,
            sortOrder: plan.sortOrder,
            description: plan.description,
            analytics: (mask & 1) === 1,
            multiUser: (mask & 2) === 2,
            api: (mask & 4) === 4,
            branding: (mask & 8) === 8,
            delivery: (mask & 16) === 16
        });
    }

    calculateBitmask(): number {
        let mask = 0;
        const val = this.form.value;
        if (val.analytics) mask += 1;
        if (val.multiUser) mask += 2;
        if (val.api) mask += 4;
        if (val.branding) mask += 8;
        if (val.delivery) mask += 16;
        return mask;
    }

    onSubmit() {
        if (this.form.invalid) return;

        const payload = {
            ...this.form.value,
            featuresBitmask: this.calculateBitmask()
        };

        // Remove temp checkbox fields
        delete payload.analytics;
        delete payload.multiUser;
        delete payload.api;
        delete payload.branding;
        delete payload.delivery;

        if (this.isEditMode) {
            this.superAdminService.updatePlan(this.data.id, payload).subscribe({
                next: () => {
                    this.snackBar.open('Plan updated successfully', 'Close', { duration: 3000 });
                    this.dialogRef.close(true);
                },
                error: () => this.snackBar.open('Failed to update plan', 'Close', { duration: 3000 })
            });
        } else {
            this.superAdminService.createPlan(payload).subscribe({
                next: () => {
                    this.snackBar.open('Plan created successfully', 'Close', { duration: 3000 });
                    this.dialogRef.close(true);
                },
                error: () => this.snackBar.open('Failed to create plan', 'Close', { duration: 3000 })
            });
        }
    }
}
