import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { FoodItem } from '../../models/food-item.model';

export interface CartItem {
  menuItem: FoodItem;
  qty: number;
}

const STORAGE_KEY = 'rms_cart_v1';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private _items$ = new BehaviorSubject<CartItem[]>(this.load());
  readonly items$ = this._items$.asObservable();

  constructor() {
    // Keep storage synced if any change happens elsewhere
    window.addEventListener('storage', () => this.syncFromStorage());
  }

  private syncFromStorage() {
    const updated = this.load();
    this._items$.next(updated);
  }

  /** Get current items snapshot */
  get items(): CartItem[] {
    return this._items$.getValue();
  }

  /** Load items from localStorage */
  private load(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  /** Save items and emit update */
  private save(items: CartItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    this._items$.next(items);
  }

  /** Add or increase quantity */
  add(menuItem: FoodItem, qty = 1) {
    const items = [...this.items];
    const idx = items.findIndex(i => i.menuItem.id === menuItem.id);
    if (idx >= 0) items[idx].qty += qty;
    else items.push({ menuItem, qty });
    this.save(items);
  }

  /** Update item quantity */
  updateQty(menuItemId: number, qty: number) {
    const items = this.items
      .map(i => i.menuItem.id === menuItemId ? { ...i, qty } : i)
      .filter(i => i.qty > 0);
    this.save(items);
  }

  /** Remove single item */
  remove(menuItemId: number) {
    const items = this.items.filter(i => i.menuItem.id !== menuItemId);
    this.save(items);
  }

  /** Empty the cart */
  clear() {
    this.save([]);
  }

  /** Total price */
  getTotal(): number {
    return this.items.reduce((s, it) => s + it.menuItem.price * it.qty, 0);
  }

  /** Total item count */
  getCount(): number {
    return this.items.reduce((s, it) => s + it.qty, 0);
  }
}
