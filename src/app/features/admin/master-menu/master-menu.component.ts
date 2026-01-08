import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterMenuService, MasterMenuItem } from '../../../core/services/master-menu.service';
import { ImageService } from '../../../core/services/image.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

// Material Imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-master-menu',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        // Material Modules
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatInputModule,
        MatSelectModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatFormFieldModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './master-menu.component.html',
    styleUrls: ['./master-menu.component.scss']
})
export class MasterMenuComponent implements OnInit {
    // Data Source
    dataSource = new MatTableDataSource<MasterMenuItem>([]);
    displayedColumns: string[] = ['name', 'category', 'price', 'status', 'actions'];

    // UI State
    isLoading = false;
    isSaving = false;
    showModal = false;
    isEditMode = false;
    selectedId: string | null = null;
    errorMessage = '';

    // Filters
    searchValue = '';
    selectedCategory = 'ALL';
    categories: string[] = [];

    // Forms
    itemForm: FormGroup;
    tenantGroupId: string | null = null;
    isUploading = false;

    // View Children
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private masterMenuService: MasterMenuService,
        private auth: AuthService,
        private fb: FormBuilder,
        private toastr: ToastrService,
        private imageService: ImageService
    ) {
        this.itemForm = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            category: [''],
            basePrice: [0, [Validators.required, Validators.min(0)]],
            imageUrl: [''],
            isAvailable: [true]
        });
    }

    ngOnInit(): void {
        const user = this.auth.currentUser();
        if (user && user.restaurantId && user.availableRestaurants) {
            const currentRestaurant = user.availableRestaurants.find(r => r.id === user.restaurantId);
            if (currentRestaurant && currentRestaurant.groupId) {
                this.tenantGroupId = currentRestaurant.groupId;
                this.loadItems();
            } else {
                this.toastr.error('No Tenant Group found for this restaurant.');
            }
        }
    }

    loadItems(): void {
        if (!this.tenantGroupId) return;
        this.isLoading = true;
        this.masterMenuService.getAll(this.tenantGroupId).subscribe({
            next: (data) => {
                this.isLoading = false;
                this.dataSource.data = data;
                this.categories = [...new Set(data.map(i => i.category || 'Uncategorized'))].sort();

                // Initialize Paginator/Sort after data load
                setTimeout(() => {
                    this.dataSource.paginator = this.paginator;
                    this.dataSource.sort = this.sort;
                    this.setupFilterPredicate();
                });
            },
            error: (err) => {
                this.isLoading = false;
                this.toastr.error('Failed to load menu');
                console.error(err);
            }
        });
    }

    setupFilterPredicate() {
        this.dataSource.filterPredicate = (data: MasterMenuItem, filter: string) => {
            const searchTerms = JSON.parse(filter);
            const nameMatch = data.name.toLowerCase().includes(searchTerms.search.toLowerCase());
            const catMatch = searchTerms.category === 'ALL' || data.category === searchTerms.category;
            return nameMatch && catMatch;
        };
    }

    applyFilters() {
        const filterValue = JSON.stringify({
            search: this.searchValue,
            category: this.selectedCategory
        });
        this.dataSource.filter = filterValue;
        if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
        }
    }

    resetFilters() {
        this.searchValue = '';
        this.selectedCategory = 'ALL';
        this.applyFilters();
    }

    // --- Actions ---

    openModal(): void {
        this.isEditMode = false;
        this.selectedId = null;
        this.itemForm.reset({ isAvailable: true, basePrice: 0 });
        this.showModal = true;
    }

    closeModal(): void {
        this.showModal = false;
    }

    editItem(item: MasterMenuItem): void {
        this.isEditMode = true;
        this.selectedId = item.id!;
        this.itemForm.patchValue(item);
        this.showModal = true;
    }

    saveItem(): void {
        if (this.itemForm.invalid || !this.tenantGroupId) return;

        this.isSaving = true;
        const payload = { ...this.itemForm.value, tenantGroupId: this.tenantGroupId };

        const request$ = (this.isEditMode && this.selectedId)
            ? this.masterMenuService.update(this.selectedId, payload)
            : this.masterMenuService.create(payload);

        request$.subscribe({
            next: () => {
                this.toastr.success(this.isEditMode ? 'Updated!' : 'Created!');
                this.isSaving = false;
                this.closeModal();
                this.loadItems();
            },
            error: () => {
                this.toastr.error('Operation failed');
                this.isSaving = false;
            }
        });
    }

    onFileSelected(event: any): void {
        const file: File = event.target.files[0];
        if (file) {
            this.isUploading = true;
            this.imageService.uploadImage(file).subscribe({
                next: (res: any) => {
                    this.itemForm.patchValue({ imageUrl: res.url });
                    this.isUploading = false;
                    this.toastr.success('Image uploaded!');
                },
                error: () => {
                    this.toastr.error('Upload failed');
                    this.isUploading = false;
                }
            });
        }
    }

    // --- Helpers ---
    toggleStatus(item: MasterMenuItem) {
        // Optimistic update
        if (!this.tenantGroupId || !item.id) return;

        const newStatus = !item.isAvailable;
        const originalStatus = item.isAvailable;

        // Update local state immediately for responsiveness
        item.isAvailable = newStatus;

        // Construct payload properly
        const payload = { ...item, isAvailable: newStatus, tenantGroupId: this.tenantGroupId };

        this.masterMenuService.update(item.id, payload).subscribe({
            next: () => this.toastr.success('Status updated'),
            error: () => {
                item.isAvailable = originalStatus; // Revert on error
                this.toastr.error('Failed to update status');
            }
        });
    }

    getStatusClass(isAvailable: boolean): string {
        return isAvailable ? 'status-active' : 'status-inactive';
    }
}
