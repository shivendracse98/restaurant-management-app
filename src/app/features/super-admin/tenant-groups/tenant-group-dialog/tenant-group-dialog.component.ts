import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../../services/super-admin.service';
import { TenantGroup, GroupStatus, BillingModel, MenuModel } from '../../models/tenant-group.model';
import { AddRestaurantDialogComponent } from '../add-restaurant-dialog/add-restaurant-dialog.component';

@Component({
    selector: 'app-tenant-group-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatInputModule,
        MatSelectModule,
        MatRadioModule,
        MatTabsModule,
        MatIconModule,
        MatListModule,
        MatDividerModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './tenant-group-dialog.component.html',
    styleUrls: ['./tenant-group-dialog.component.css']
})
export class TenantGroupDialogComponent implements OnInit {
    form: FormGroup;
    isEditMode: boolean = false;
    isLoading: boolean = false;
    errorMessage: string = '';

    // Enums for template
    GroupStatus = GroupStatus;
    BillingModel = BillingModel;
    MenuModel = MenuModel;

    constructor(
        private fb: FormBuilder,
        private superAdminService: SuperAdminService,
        private dialog: MatDialog,
        public dialogRef: MatDialogRef<TenantGroupDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit', group?: TenantGroup }
    ) {
        this.isEditMode = data.mode === 'edit';

        this.form = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: [''],
            ownerName: ['', [Validators.required]],
            ownerEmail: ['', [Validators.required, Validators.email]],
            billingModel: ['GROUP_LEVEL', [Validators.required]],
            menuModel: ['MASTER_MENU', [Validators.required]],
            packageType: ['PROFESSIONAL', [Validators.required]],
            status: ['ACTIVE']
        });
    }

    linkedRestaurants: any[] = [];

    ngOnInit(): void {
        if (this.isEditMode && this.data.group) {
            this.form.patchValue(this.data.group);
            this.loadLinkedRestaurants();
        }
    }

    loadLinkedRestaurants(): void {
        if (!this.data.group) return;
        this.superAdminService.getGroupRestaurants(this.data.group.id).subscribe({
            next: (data) => this.linkedRestaurants = data,
            error: (err) => console.error('Error loading restaurants', err)
        });
    }

    openAddRestaurantDialog(): void {
        if (!this.data.group) return;

        const dialogRef = this.dialog.open(AddRestaurantDialogComponent, {
            width: '500px',
            data: {
                groupId: this.data.group.id,
                existingRestaurantIds: this.linkedRestaurants.map(r => r.tenantId)
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadLinkedRestaurants();
            }
        });
    }

    unlinkRestaurant(restaurantId: string): void {
        if (!this.data.group) return;

        if (confirm('Are you sure you want to remove this restaurant from the group?')) {
            this.superAdminService.removeRestaurantFromGroup(this.data.group.id, restaurantId).subscribe({
                next: () => {
                    this.loadLinkedRestaurants();
                },
                error: (err) => {
                    alert('Failed to remove restaurant');
                }
            });
        }
    }

    onSubmit(): void {
        if (this.form.invalid) return;

        this.isLoading = true;
        this.errorMessage = '';
        const formData = this.form.value;

        if (this.isEditMode && this.data.group) {
            this.superAdminService.updateTenantGroup(this.data.group.id, formData).subscribe({
                next: () => {
                    this.isLoading = false;
                    this.dialogRef.close(true);
                },
                error: (err) => {
                    this.isLoading = false;
                    this.errorMessage = err.error?.message || 'Failed to update group';
                }
            });
        } else {
            this.superAdminService.createTenantGroup(formData).subscribe({
                next: () => {
                    this.isLoading = false;
                    this.dialogRef.close(true);
                },
                error: (err) => {
                    this.isLoading = false;
                    this.errorMessage = err.error?.message || 'Failed to create group';
                }
            });
        }
    }
}
