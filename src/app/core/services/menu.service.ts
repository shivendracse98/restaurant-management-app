import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FoodItem } from '../../models/food-item.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly apiUrl = `${environment.apiBaseUrl}/menu`;

  constructor(private http: HttpClient) { }

  /**
   * ✅ NEW: Fetch all menu items from backend (db.json / API)
   */
  getAllMenuItems(): Observable<FoodItem[]> {
    return this.http.get<FoodItem[]>(this.apiUrl).pipe(
      tap((data: any) => console.log('🍽️ Raw Menu Data from API:', data)),
      catchError(err => {
        console.error('❌ API fetch failed. Showing empty menu to indicate DB disconnection.', err);
        return of([]); // Return empty to prove we are NOT using static data
        // return this.getMenu(); // fallback DISABLED to ensure DB testing
      })
    );
  }

  /**
   * ✅ LEGACY: Local mock menu (kept for compatibility)
   * Used when no backend connection or older components still use it.
   */
  getMenu(tenantId?: string): Observable<FoodItem[]> {
    let url = this.apiUrl;
    if (tenantId) {
      url += `?tenant_id=${tenantId}`;
    }
    return this.http.get<FoodItem[]>(url).pipe(
      tap((data: any) => console.log(`🍽️ Menu Data for ${tenantId || 'all'}:`, data)),
      catchError(err => {
        console.error('❌ API fetch failed.', err);
        return of([]);
      })
    );
  }

  getMockMenu(): Observable<FoodItem[]> {
    const items: FoodItem[] = [
      {
        id: 1,
        name: 'Margherita Pizza',
        description: 'Classic delight with 100% real mozzarella cheese.',
        price: 299,
        imageUrl: 'assets/pizza-margherita.jpg',
        category: 'Pizza'
      },
      {
        id: 2,
        name: 'Veg Burger',
        description: 'Crispy veg patty with fresh veggies and tangy sauce.',
        price: 149,
        imageUrl: 'assets/veg-burger.jpg',
        category: 'Burger'
      },
      {
        id: 3,
        name: 'Pasta Alfredo',
        description: 'Creamy Alfredo sauce with perfectly cooked pasta.',
        price: 249,
        imageUrl: 'assets/pasta-alfredo.jpg',
        category: 'Pasta'
      }
    ];

    return of(items);
  }

  /**
   * ✅ Fetch a single item by ID
   */
  getMenuItemById(id: number | string): Observable<FoodItem> {
    return this.http.get<FoodItem>(`${this.apiUrl}/${id}`);
  }

  /**
   * ✅ Fetch menu items by category
   */
  getMenuByCategory(category: string): Observable<FoodItem[]> {
    return this.http.get<FoodItem[]>(`${this.apiUrl}?category=${category}`);
  }

  addMenuItem(item: Omit<FoodItem, 'id'>): Observable<FoodItem> {
    return this.http.post<FoodItem>(this.apiUrl, item);
  }

  updateMenuItem(id: number, item: Partial<FoodItem>): Observable<FoodItem> {
    return this.http.put<FoodItem>(`${this.apiUrl}/${id}`, item);
  }

  deleteMenuItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
