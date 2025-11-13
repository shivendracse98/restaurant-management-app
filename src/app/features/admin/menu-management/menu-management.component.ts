import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MenuService } from '../../../core/services/menu.service';
import { FoodItem } from 'src/app/models/food-item.model';

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
    MatCardModule
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
    category: ''
  };

  showForm = false;
  editingId: number | null = null;

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.loadMenuItems();
  }

  loadMenuItems(): void {
    this.loading = true;
    console.log('Loading menu items...');
    
    // Use getAllMenuItems instead of getMenu
    this.menuService.getAllMenuItems().subscribe({
      next: (items) => {
        console.log('Menu items loaded:', items.length, items);
        this.menuItems = items;
        this.filteredItems = items;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading menu:', err);
        this.loading = false;
        alert('Failed to load menu items');
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
      category: ''
    };
  }

  editItem(item: FoodItem): void {
    this.showForm = true;
    this.editingId = item.id;
    this.newItem = { ...item };
  }

  saveItem(): void {
    if (!this.newItem.name || !this.newItem.price) {
      alert('Please fill all fields');
      return;
    }

    if (this.editingId) {
      // Update
      this.menuService
        .updateMenuItem(this.editingId, this.newItem)
        .subscribe({
          next: () => {
            alert('Item updated successfully');
            this.showForm = false;
            this.loadMenuItems();
          },
          error: (err) => {
            console.error('Error updating item:', err);
            alert('Failed to update item');
          }
        });
    } else {
      // Add new
      this.menuService.addMenuItem(this.newItem as Omit<FoodItem, 'id'>).subscribe({
        next: () => {
          alert('Item added successfully');
          this.showForm = false;
          this.loadMenuItems();
        },
        error: (err) => {
          console.error('Error adding item:', err);
          alert('Failed to add item');
        }
      });
    }
  }

  deleteItem(id: number): void {
    if (confirm('Are you sure you want to delete this item?')) {
      this.menuService.deleteMenuItem(id).subscribe({
        next: () => {
          alert('Item deleted successfully');
          this.loadMenuItems();
        },
        error: (err) => {
          console.error('Error deleting item:', err);
          alert('Failed to delete item');
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
