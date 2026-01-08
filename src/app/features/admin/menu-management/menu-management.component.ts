import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MasterMenuComponent } from '../master-menu/master-menu.component';
import { MenuOverridesComponent } from '../menu-overrides/menu-overrides.component';
import { AuthService } from '../../../core/services/auth.service';
import { MenuService } from '../../../core/services/menu.service';
import { ImageService } from '../../../core/services/image.service';
import { FoodItem } from 'src/app/models/food-item.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-menu-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MasterMenuComponent,
    MenuOverridesComponent
  ],
  templateUrl: './menu-management.component.html',
  styleUrls: ['./menu-management.component.scss']
})
export class MenuManagementComponent implements OnInit {
  displayedColumns: string[] = ['id', 'name', 'category', 'price', 'actions'];
  menuItems: FoodItem[] = [];
  filteredItems: FoodItem[] = [];
  loading = false;
  searchText = '';

  newItem: Partial<FoodItem> = {
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: '',
    isVeg: true,
    isAvailable: true // Default In Stock
  };

  showForm = false;
  editingId: number | null = null;

  isUploading = false;
  uploadError = '';

  canViewConsolidated = false;
  hasGroup = false;

  constructor(
    private menuService: MenuService,
    private imageService: ImageService,
    private toastr: ToastrService,
    public auth: AuthService
  ) { }

  ngOnInit(): void {
    this.checkAccess();
    this.loadMenuItems();
  }

  checkAccess(): void {
    const user = this.auth.currentUser();
    // Allow Consolidated view if user has > 1 restaurant available AND is not on STARTER plan
    const hasMultiple = !!(user?.availableRestaurants && user.availableRestaurants.length > 1);
    const isPlanEligible = user?.packageType !== 'STARTER';

    this.canViewConsolidated = hasMultiple && isPlanEligible;
    this.hasGroup = isPlanEligible; // Show Overrides if eligible for group features
  }

  loadMenuItems(): void {
    this.loading = true;
    console.log('Loading menu items...');

    const user = this.auth.currentUser();
    const currentRestaurantId = user?.restaurantId;

    if (!currentRestaurantId) {
      console.error('No restaurant ID found for user');
      this.loading = false;
      return;
    }

    // Use getAllMenuItems with explicit ID
    this.menuService.getAllMenuItems(currentRestaurantId).subscribe({
      next: (items) => {
        console.log('Menu items loaded:', items.length, items);
        this.menuItems = items;
        this.filteredItems = items;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading menu:', err);
        this.loading = false;
        this.toastr.error('Failed to load menu items', 'Error');
      }
    });
  }

  onSearch(): void {
    if (this.searchText.trim() === '') {
      this.filteredItems = [...this.menuItems];
    } else {
      this.filteredItems = this.menuItems.filter(
        (item) =>
          item.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
          item.category.toLowerCase().includes(this.searchText.toLowerCase())
      );
    }
    console.log('Filtered items:', this.filteredItems.length);
  }

  openForm(): void {
    this.showForm = true;
    this.editingId = null;
    this.newItem = {
      name: '',
      description: '',
      price: 0,
      imageUrl: '',
      category: '',
      isVeg: true, // Default to Veg
      isAvailable: true // Default In Stock
    };
  }

  editItem(item: FoodItem): void {
    this.showForm = true;
    this.editingId = item.id;
    this.newItem = { ...item };
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.uploadError = '';

      this.imageService.uploadImage(file).subscribe({
        next: (response) => {
          this.newItem.imageUrl = response.url;
          this.isUploading = false;
        },
        error: (err) => {
          console.error('Upload failed', err);
          this.uploadError = 'Failed to upload image. Max size 2MB.';
          this.isUploading = false;
          this.toastr.error('Image upload failed', 'Error');
        }
      });
    }
  }

  saveItem(): void {
    if (!this.newItem.name || !this.newItem.price) {
      this.toastr.warning('Please enter both Name and Price.', 'Missing Info');
      return;
    }

    if (this.editingId) {
      // Update
      this.menuService
        .updateMenuItem(this.editingId, this.newItem)
        .subscribe({
          next: () => {
            this.toastr.success(`${this.newItem.name} updated successfully!`, 'Saved');
            this.showForm = false;
            this.loadMenuItems();
          },
          error: (err) => {
            console.error('Error updating item:', err);
            this.toastr.error('Failed to update item', 'Error');
          }
        });
    } else {
      // Add new
      this.menuService.addMenuItem(this.newItem as Omit<FoodItem, 'id'>).subscribe({
        next: () => {
          this.toastr.success(`${this.newItem.name} added to the menu!`, 'Success');
          this.showForm = false;
          this.loadMenuItems();
        },
        error: (err) => {
          console.error('Error adding item:', err);
          this.toastr.error('Failed to add item', 'Error');
        }
      });
    }
  }

  deleteItem(item: FoodItem): void {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      this.menuService.deleteMenuItem(item.id).subscribe({
        next: () => {
          this.toastr.info(`${item.name} removed from menu.`, 'Deleted');
          this.loadMenuItems();
        },
        error: (err) => {
          console.error('Error deleting item:', err);
          this.toastr.error('Failed to delete item', 'Error');
        }
      });
    }
  }

  cancelForm(): void {
    this.showForm = false;
  }

  trackByItemId(_index: number, item: FoodItem): number {
    return item.id;
  }
}
