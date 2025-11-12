import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import type { Order } from '../../models/order.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = `${environment.apiBaseUrl}/orders`;

  constructor(private http: HttpClient) {}

  /** ✅ Create a new order */
  createOrder(order: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(this.baseUrl, order);
  }

  /** ✅ Fetch single order by ID */
  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/${id}`);
  }

  /** ✅ List orders with optional status filter */
  listOrders(params?: { status?: string }): Observable<Order[]> {
    const query = params?.status ? `?status=${params.status}` : '';
    return this.http.get<Order[]>(`${this.baseUrl}${query}`);
  }

  /** ✅ Update status of an existing order */
  updateOrderStatus(id: number, status: string): Observable<Order> {
    return this.http.patch<Order>(`${this.baseUrl}/${id}`, { status });
  }

  /** ✅ Get all orders (replacement for your old hardcoded one) */
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.baseUrl);
  }

    /** ✅ Update full or partial order (used by staff to edit or mark payment done) */
    updateOrder(id: number, changes: Partial<Order>): Observable<Order> {
      return this.http.patch<Order>(`${this.baseUrl}/${id}`, changes);
    }
    

}
