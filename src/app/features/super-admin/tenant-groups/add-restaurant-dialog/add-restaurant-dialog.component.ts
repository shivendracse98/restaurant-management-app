import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SuperAdminService } from '../../services/super-admin.service';
import { TenantDetail } from '../../models/tenant-detail.model';

@Component({
    selector: 'app-add-restaurant-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatInputModule,
        MatIconModule,
        MatListModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './add-restaurant-dialog.component.html',
    styleUrls: ['./add-restaurant-dialog.component.css']
})
export class AddRestaurantDialogComponent implements OnInit {
    searchTerm: string = '';
    allRestaurants: TenantDetail[] = [];
    filteredRestaurants: TenantDetail[] = [];
    selectedRestaurant: TenantDetail | null = null;
    isLoading: boolean = false;
    isAssigning: boolean = false;
    errorMessage: string = '';

    constructor(
        private superAdminService: SuperAdminService,
        public dialogRef: MatDialogRef<AddRestaurantDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { groupId: string, existingRestaurantIds: string[] }
    ) { }

    ngOnInit(): void {
        this.loadRestaurants();
    }

    loadRestaurants(): void {
        this.isLoading = true;
        this.superAdminService.getAllTenants().subscribe({
            next: (data) => {
                // Filter out already linked restaurants
                this.allRestaurants = data.filter(r => !this.data.existingRestaurantIds.includes(r.tenantId));
                this.filteredRestaurants = this.allRestaurants;
                this.isLoading = false;
            },
            error: (err) => {
                this.errorMessage = 'Failed to load restaurants';
                this.isLoading = false;
            }
        });
    }

    filter(): void {
        const term = this.searchTerm.toLowerCase();
        this.filteredRestaurants = this.allRestaurants.filter(r =>
            r.restaurantName.toLowerCase().includes(term) ||
            r.tenantId.toLowerCase().includes(term)
        );
    }

    select(restaurant: TenantDetail): void {
        this.selectedRestaurant = restaurant;
    }

    assign(): void {
        if (!this.selectedRestaurant) return;

        this.isAssigning = true;
        this.superAdminService.assignRestaurantToGroup(this.selectedRestaurant.tenantId, this.data.groupId).subscribe({
            next: () => {
                this.isAssigning = false;
                this.dialogRef.close(true);
            },
            error: (err) => {
                this.isAssigning = false;
                this.errorMessage = 'Failed to assign restaurant';
            }
        });
    }
}
