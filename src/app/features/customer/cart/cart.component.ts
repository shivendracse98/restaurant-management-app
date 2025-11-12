import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent {
  // Observable of cart items for async pipe
  items$ = this.cart.items$;

  constructor(public cart: CartService, private router: Router, public auth: AuthService) {}

  /** Track list rendering performance by item ID */
  trackById(index: number, item: any) {
    return item.menuItem.id;
  }

  /** Explicit navigation to checkout page */
  goToCheckout() {
    if (!this.auth.isLoggedIn) {
      alert('Please login to place an order.');
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/checkout']);
  }
}






