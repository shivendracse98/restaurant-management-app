import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuService } from '../../../core/services/menu.service';
import { FoodItem } from '../../../models/food-item.model';
import { RouterModule } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AppComponent } from 'src/app/app.component';

export type MenuViewMode = 'customer' | 'admin';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss']
})
export class MenuListComponent implements OnInit {
  @Input() viewMode: MenuViewMode = 'customer';

  foodItems: FoodItem[] = [];

  constructor(
    private menuService: MenuService,
    private cart: CartService,
    private app: AppComponent
  ) {}

  ngOnInit(): void {
    this.loadMenu();
  }

  loadMenu(): void {
    this.menuService.getMenu().subscribe({
      next: (data) => {
        console.log('✅ Menu Loaded:', data);
        this.foodItems = data;
      },
      error: (err) => console.error('❌ Error loading menu:', err)
    });
  }

  addToCart(item: FoodItem): void {
    if (this.viewMode !== 'customer') return;
    this.cart.add(item);
    this.app.showToast(`${item.name} added to cart!`);
  }

  isAdminMode(): boolean {
    return this.viewMode === 'admin';
  }

  isCustomerMode(): boolean {
    return this.viewMode === 'customer';
  }

  editMenuItem(item: FoodItem): void {
    if (this.viewMode !== 'admin') return;
    console.log('Edit item:', item);
    // TODO: Implement edit dialog
  }

  deleteMenuItem(item: FoodItem): void {
    if (this.viewMode !== 'admin') return;

    if (confirm(`Delete ${item.name}?`)) {
      // For now, just remove from local array
      this.foodItems = this.foodItems.filter((i) => i.id !== item.id);
      this.app.showToast('Item deleted successfully');
      
      // TODO: When backend is ready, uncomment:
      // this.menuService.deleteMenuItem(item.id).subscribe({
      //   next: () => {
      //     this.app.showToast('Item deleted successfully');
      //     this.foodItems = this.foodItems.filter((i) => i.id !== item.id);
      //   },
      //   error: () => {
      //     this.app.showToast('Failed to delete item');
      //   }
      // });
    }
  }

  trackByItemId(_index: number, item: FoodItem): number {
    return item.id;
  }
}
