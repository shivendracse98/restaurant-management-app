import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { OfferService, Offer } from 'src/app/core/services/offer.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  // Observable of cart items for async pipe
  items$ = this.cart.items$;

  // Coupon Logic
  couponCode = '';
  discountAmount = 0;
  couponMessage = '';
  isCouponApplied = false;
  activeOffers: Offer[] = [];


  ngOnInit(): void {
    this.loadActiveOffers();
  }

  loadActiveOffers() {
    this.offerService.getActiveOffers().subscribe({
      next: (offers) => this.activeOffers = offers,
      error: () => console.error('Failed to load active offers')
    });
  }

  applyOffer(code: string) {
    this.couponCode = code;
    this.applyCoupon();
  }

  constructor(
    public cart: CartService,
    private router: Router,
    public auth: AuthService,
    private offerService: OfferService
  ) { }

  get subTotal(): number {
    return this.cart.getTotal();
  }

  get finalTotal(): number {
    return Math.max(0, this.subTotal - this.discountAmount);
  }

  applyCoupon() {
    if (!this.couponCode.trim()) return;

    this.offerService.validateCoupon(this.couponCode, this.subTotal).subscribe(res => {
      if (res.valid) {
        this.discountAmount = res.discountAmount;
        this.isCouponApplied = true;
        this.couponMessage = res.message; // "Coupon Applied Successfully"
      } else {
        this.discountAmount = 0;
        this.isCouponApplied = false;
        this.couponMessage = res.message; // Error message
      }
    });
  }

  removeCoupon() {
    this.couponCode = '';
    this.discountAmount = 0;
    this.isCouponApplied = false;
    this.couponMessage = '';
  }

  /** Track list rendering performance by item ID */
  trackById(index: number, item: any) {
    return item.menuItem.id;
  }

  /** Explicit navigation to checkout page */
  goToCheckout() {
    if (!this.auth.isLoggedIn()) {
      // Improved: seamless redirect with context
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: '/checkout',
          reason: 'checkout'
        }
      });
      return;
    }

    // Store coupon for Checkout component
    sessionStorage.setItem('applied_coupon', JSON.stringify({
      code: this.couponCode,
      discount: this.discountAmount
    }));

    this.router.navigate(['/checkout']);
  }
}






