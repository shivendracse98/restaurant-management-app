import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MenuService } from '../../../core/services/menu.service';
import { FoodItem } from '../../../models/food-item.model';
import { CartService } from '../../../core/services/cart.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-food-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './food-detail.component.html',
  styleUrls: ['./food-detail.component.scss']
})
export class FoodDetailComponent implements OnInit {
  food?: FoodItem;

  constructor(
  private route: ActivatedRoute,
  private menuService: MenuService,
  private cart: CartService,
  private router: Router
) {}

goBack() {
  this.router.navigate(['/menu']);
}


  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.menuService.getMenu().subscribe((items) => {
      this.food = items.find(f => f.id === id);
    });
  }
  addToCart() {
    if (this.food) {
      this.cart.add(this.food);
      alert(`${this.food.name} added to cart!`);
    }
  }
}
