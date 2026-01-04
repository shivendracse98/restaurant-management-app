import { Component, input, output, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FoodItem } from '../../../../../models/food-item.model';

@Component({
  selector: 'app-pos-order-taking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './pos-order-taking.component.html',
  styleUrls: ['./pos-order-taking.component.scss']
})
export class PosOrderTakingComponent {
  // --- SIGNALS (Inputs) ---
  menuItems = input.required<FoodItem[]>();
  orderForm = input.required<FormGroup>();
  isLoading = input<boolean>(false);
  isManageMode = input<boolean>(false);

  // --- OUTPUTS ---
  addToCart = output<FoodItem>();
  removeFromCartInput = output<number>();
  placeOrderTrigger = output<void>();
  clearCartTrigger = output<void>();
  toggleStock = output<FoodItem>();

  // --- Local State ---
  searchTerm = signal('');

  constructor() {
    // Optional: Log when inputs change (for debugging)
    effect(() => {
      // console.log('Menu Items updated:', this.menuItems().length);
    });
  }

  // --- Computed / Getters ---
  get filteredMenu(): FoodItem[] {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.menuItems();

    return this.menuItems().filter(m =>
      (m.name || '').toLowerCase().includes(term) ||
      (m.category || '').toLowerCase().includes(term)
    );
  }

  get cartItems(): FoodItem[] {
    // Accessing FormArray value via parent FormGroup
    return this.orderForm().get('items')?.value || [];
  }

  getTotal(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.price || 0), 0);
  }

  // --- Actions ---
  onAddItem(item: FoodItem) {
    if (this.isManageMode()) {
      this.toggleStock.emit(item);
    } else {
      this.addToCart.emit(item);
    }
  }

  onRemoveItem(index: number) {
    this.removeFromCartInput.emit(index);
  }

  onPlaceOrder() {
    this.placeOrderTrigger.emit();
  }

  onClearCart() {
    this.clearCartTrigger.emit();
  }
}
