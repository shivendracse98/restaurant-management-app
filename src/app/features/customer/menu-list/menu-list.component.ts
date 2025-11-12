import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuService } from '../../../core/services/menu.service';
import { FoodItem } from '../../../models/food-item.model';
import { RouterModule } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AppComponent } from 'src/app/app.component';


@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss']
})
export class MenuListComponent implements OnInit {
  foodItems: FoodItem[] = [];

  constructor(private menuService: MenuService, private cart: CartService, private app: AppComponent) {}

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
  
  addToCart(item: FoodItem) {
  this.cart.add(item);
  this.app.showToast(`${item.name} added to cart!`);
}

}



