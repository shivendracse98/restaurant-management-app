import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterMenuService, MasterMenuItem, MenuOverride } from '../../../core/services/master-menu.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

interface OverrideRow {
    masterItem: MasterMenuItem;
    override?: MenuOverride;
}

@Component({
    selector: 'app-menu-overrides',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './menu-overrides.component.html',
    styleUrls: ['./menu-overrides.component.scss']
})
export class MenuOverridesComponent implements OnInit {
    items: MasterMenuItem[] = []; // Master Items
    overridesMap: Map<string, MenuOverride> = new Map(); // Fast lookup

    isLoading = false;
    isSaving = false;

    currentRestaurantId: string = '';
    currentRestaurantName: string = '';
    tenantGroupId: string = '';

    // Modal State
    selectedItem: MasterMenuItem | null = null;

    // Form
    overrideForm: FormGroup;
    // We bind the form data to a temporary object model for the view if needed, 
    // but the form itself holds the truth.

    constructor(
        private masterMenuService: MasterMenuService,
        private authService: AuthService,
        private toastr: ToastrService,
        private fb: FormBuilder
    ) {
        this.overrideForm = this.fb.group({
            overridePrice: [null, [Validators.min(0)]],
            overrideAvailable: [true], // Default true
            reason: ['']
        });
    }

    ngOnInit(): void {
        const user = this.authService.currentUser();
        if (user && user.restaurantId && user.availableRestaurants) {
            this.currentRestaurantId = user.restaurantId;
            const currentRestaurant = user.availableRestaurants.find(r => r.id === user.restaurantId);

            if (currentRestaurant && currentRestaurant.groupId) {
                this.tenantGroupId = currentRestaurant.groupId;
                this.currentRestaurantName = currentRestaurant.name;
                this.loadData();
            } else {
                this.toastr.error('No Tenant Group found for this restaurant.');
            }
        } else {
            // If debugging is needed, keeping logs minimal now
            console.warn('User context missing for Menu Overrides');
        }
    }

    loadData() {
        this.isLoading = true;

        // Parallel Fetch using ForkJoin is better, but nested subscribe is okay for now
        this.masterMenuService.getAll(this.tenantGroupId).subscribe({
            next: (masterItems) => {
                this.items = masterItems;

                // Fetch Overrides
                this.masterMenuService.getOverrides(this.currentRestaurantId).subscribe({
                    next: (overrides) => {
                        this.overridesMap.clear();
                        overrides.forEach(o => this.overridesMap.set(o.masterItemId, o));
                        this.isLoading = false;
                    },
                    error: () => this.isLoading = false
                });
            },
            error: (err) => {
                this.toastr.error('Failed to load menu items');
                this.isLoading = false;
            }
        });
    }

    // --- Template Helpers ---

    getCurrentRestaurantName(): string {
        return this.currentRestaurantName;
    }

    hasOverride(masterItemId: string): boolean {
        return this.overridesMap.has(masterItemId);
    }

    getOverride(masterItemId: string): MenuOverride | undefined {
        return this.overridesMap.get(masterItemId);
    }

    // --- Modal Actions ---

    openOverrideModal(item: MasterMenuItem) {
        this.selectedItem = item;
        const existingOverride = this.overridesMap.get(item.id!);

        if (existingOverride) {
            this.overrideForm.patchValue({
                overridePrice: existingOverride.overridePrice,
                overrideAvailable: existingOverride.overrideAvailable,
                reason: existingOverride.reason
            });
        } else {
            // New Override - Default logic
            this.overrideForm.reset();
            this.overrideForm.patchValue({
                overrideAvailable: item.isAvailable, // Default to Master's availability
                overridePrice: null // Empty means "Use Master Price"
            });
        }
    }

    closeModal() {
        this.selectedItem = null;
    }

    saveOverride() {
        if (!this.selectedItem) return;
        this.isSaving = true;

        const formVal = this.overrideForm.value;
        const existingOverride = this.overridesMap.get(this.selectedItem.id!);

        const overridePayload: MenuOverride = {
            id: existingOverride?.id, // Includes ID if updating
            restaurantId: this.currentRestaurantId,
            masterItemId: this.selectedItem.id!,
            overridePrice: formVal.overridePrice,
            overrideAvailable: formVal.overrideAvailable,
            reason: formVal.reason
        };

        this.masterMenuService.upsertOverride(overridePayload).subscribe({
            next: (savedOverride) => {
                this.toastr.success('Override saved and synced!');
                this.isSaving = false;
                this.closeModal();
                this.loadData();
            },
            error: (err) => {
                console.error(err);
                this.toastr.error(err.error?.message || 'Failed to save override');
                this.isSaving = false;
            }
        });
    }
}
