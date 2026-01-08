import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, from, of, catchError, switchMap, tap, map } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NetworkService } from './network.service';
import { OfflineService } from './offline.service';
import { Order } from '../../models/order.model';
import { TenantService } from './tenant.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiBaseUrl}/orders`;

  // Cache subject
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  public orders$ = this.ordersSubject.asObservable();

  constructor(
    private http: HttpClient,
    private networkService: NetworkService,
    private offlineService: OfflineService,
    private toastr: ToastrService,
    private tenantService: TenantService
  ) {
    // Monitor connectivity and sync when back online
    this.networkService.isOnline$.subscribe(isOnline => {
      if (isOnline) {
        this.syncOfflineOrders();
      }
    });

    // Initial load
    this.loadOrders();
  }

  getOrders(): Observable<Order[]> {
    return this.orders$;
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`).pipe(
      map(o => this.mapBackendOrderToFrontend(o)),
      catchError(error => {
        console.warn(`⚠️ GET /orders/${id} failed (${error.status}), attempting fallback to my-orders...`);
        return this.http.get<any[]>(`${this.apiUrl}/my-orders`).pipe(
          map(orders => {
            const match = orders.find(o => o.id === id);
            if (match) return this.mapBackendOrderToFrontend(match); // Reuse mapping logic if possible, or mapping manually
            throw error; // If still not found, throw original error
          }),
          map(order => {
            // Ensure we map it identically to createOrder/loadOrders
            return order;
          })
        );
      })
    );
  }

  // Helper to centralize mapping (extracted from loadOrders)
  private mapBackendOrderToFrontend(backendOrder: any): Order {
    const metadata = backendOrder.notes ? JSON.parse(backendOrder.notes) : {};
    return {
      ...backendOrder,
      ...metadata,
      total: backendOrder.totalAmount || backendOrder.total,
      items: (backendOrder.items || []).map((i: any) => ({
        menuItemId: i.menuItemId,
        qty: i.quantity || i.qty,
        name: i.itemName || i.name,
        price: i.pricePerUnit || i.price,
        status: i.status
      }))
    };
  }

  /**
   * ✅ Get orders for a specific customer (Filtered by Phone)
   */
  getOrdersByPhone(phone: string): Observable<Order[]> {
    return this.orders$.pipe(
      switchMap(orders => of(orders.filter(o => o.customerPhone === phone)))
    );
  }

  /**
   * ✅ Get orders for a specific customer (Filtered by Email)
   */
  getOrdersByEmail(email: string): Observable<Order[]> {
    return this.orders$.pipe(
      switchMap(orders => of(orders.filter(o => o.customerEmail === email)))
    );
  }

  /**
   * ✅ Get orders for the logged-in user (Backend Filtered)
   * GET /api/orders/my-orders
   */
  getMyOrders(): Observable<Order[]> {
    const tenantId = this.tenantService.getTenantId();
    let params = new HttpParams();
    if (tenantId) {
      params = params.set('restaurantId', tenantId);
    }

    return this.http.get<any[]>(`${this.apiUrl}/my-orders`, { params }).pipe(
      map(orders => orders.map(o => this.mapBackendOrderToFrontend(o))),
      catchError(err => {
        console.error('Failed to load my orders', err);
        return of([]);
      })
    );
  }

  /**
   * ✅ Get orders for a user (Filter by ID, Email, or Phone)
   * legacy method - kept for compatibility if needed, but favors getMyOrders
   */
  getOrdersForUser(email?: string, phone?: string, userId?: number): Observable<Order[]> {
    // If we have a user context, try the direct endpoint first
    if (userId) {
      return this.getMyOrders();
    }
    return this.orders$.pipe(
      switchMap(orders => of(orders.filter(o => {
        if (userId && o.customerId === userId) return true; // ✅ Check Customer ID (Strict match)
        if (email && o.customerEmail === email) return true;
        if (phone && o.customerPhone === phone) return true;
        return false;
      })))
    );
  }

  /**
   * ✅ Fetch all orders from backend and update cache
   * Returns Observable for components that want to wait for completion
   */
  refreshOrders(): Observable<Order[]> {
    if (!this.networkService.isOnline) {
      return of(this.ordersSubject.value);
    }

    return this.http.get<any[]>(this.apiUrl).pipe(
      // Map backend response architecture to frontend model
      map(orders => {
        return orders.map(o => this.mapBackendOrderToFrontend(o));
      }),
      tap(orders => this.ordersSubject.next(orders)),
      catchError(err => {
        console.error('Failed to load orders', err);
        return of([]);
      })
    );
  }

  // Legacy/Void version for constructor/init
  loadOrders(): void {
    this.refreshOrders().subscribe();
  }

  createOrder(order: any): Observable<any> {
    // Map frontend model to API request model
    const payload = {
      customerId: order.userId, // ✅ Send User ID to link order
      restaurantId: order.restaurantId, // ✅ Send Tenant ID explicitly
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress || order.address, // Support both formats
      deliveryPincode: order.deliveryPincode || order.pincode, // Support both formats
      orderType: order.orderType,
      items: order.items.map((i: any) => ({
        menuItemId: i.menuItemId || i.id, // Handle both cases safely
        itemName: i.name || i.itemName, // Handle both name fields
        quantity: i.qty,
        pricePerUnit: i.price,
        subtotal: i.qty * i.price
      })),
      totalAmount: order.total,
      notes: order.notes // Send original notes directly
    };

    if (this.networkService.isOnline) {
      return this.http.post<any>(this.apiUrl, payload).pipe(
        map((newOrder: any) => {
          // Map Backend DTO to Frontend Model
          return {
            ...newOrder,
            // Map backend fields back to frontend model names
            address: newOrder.deliveryAddress || order.address,
            pincode: newOrder.deliveryPincode || order.pincode,
            total: newOrder.totalAmount || payload.totalAmount,
            // Ensure items are also mapped
            items: (newOrder.items || payload.items).map((i: any) => ({
              menuItemId: i.menuItemId,
              qty: i.quantity || i.qty,
              name: i.itemName || i.name,
              price: i.pricePerUnit || i.price
            }))
          };
        }),
        tap((orderWithMeta: any) => { // Explicit type to fix implicit any
          // Update local cache
          const current = this.ordersSubject.value;
          this.ordersSubject.next([...current, orderWithMeta]);
        })
      );
    } else {
      // Offline Flow
      return from(this.offlineService.saveOrder(order)).pipe(
        tap(() => {
          this.toastr.info('Order saved locally. Will sync when online.', 'Offline Mode');
        }),
        switchMap(() => of({ ...order, status: 'PENDING_SYNC', id: 'TEMP_' + Date.now() }))
      );
    }
  }

  updateOrder(id: number | string, data: any): Observable<any> {
    // Map frontend model to API request model
    const payload = {
      ...data,
      restaurantId: data.restaurantId || this.tenantService.getTenantId(), // Ensure tenant ID
      items: (data.items || []).map((i: any) => ({
        menuItemId: i.menuItemId || i.id,
        itemName: i.name || i.itemName, // Map name -> itemName
        quantity: i.qty || i.quantity,
        pricePerUnit: i.price || i.pricePerUnit,
        subtotal: (i.qty || i.quantity) * (i.price || i.pricePerUnit)
      }))
    };

    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      tap((updatedOrder) => {
        // Optimistic update (or response sync)
        const current = this.ordersSubject.value;
        const index = current.findIndex(o => o.id == id);
        if (index > -1) {
          // Merge backed response to ensure consistency
          const mapped = this.mapBackendOrderToFrontend(updatedOrder);
          current[index] = mapped;
          this.ordersSubject.next([...current]);
        }
      })
    );
  }

  /**
   * ✅ Handle Real-time Update from WebSocket
   * Merges the payload into local cache immediately, avoiding Refetch Race Conditions.
   */
  upsertOrderFromWebSocket(backendOrder: any): void {
    const order = this.mapBackendOrderToFrontend(backendOrder);
    const current = this.ordersSubject.value;
    const index = current.findIndex(o => o.id === order.id);

    if (index > -1) {
      // Update existing
      current[index] = order;
      this.ordersSubject.next([...current]);
    } else {
      // Add new
      this.ordersSubject.next([order, ...current]);
    }
  }

  updateOrderStatus(id: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, null, { params: { status } }).pipe(
      tap(() => {
        const current = this.ordersSubject.value;
        const index = current.findIndex(o => o.id == id);
        if (index > -1) {
          const updatedOrder = { ...current[index] };
          updatedOrder.status = status as any;
          // ✅ Propagate status to items to match Backend Bridge Logic
          if (updatedOrder.items) {
            updatedOrder.items = updatedOrder.items.map((i: any) => ({ ...i, status: status }));
          }
          current[index] = updatedOrder;
          this.ordersSubject.next([...current]);
        }
      })
    );
  }

  payOrder(orderId: number, paymentMode: string, amount: number, extras?: any): Observable<any> {
    // V2: Support for extras (Proof/Counter)
    console.log(`Paying order ${orderId} with ${paymentMode} - Amount: ${amount}`, extras);

    // Fix: Backend Enum 'PaymentMode' does not have QR_CODE. Map it to UPI.
    // If Cash/PayAtCounter, use CASH.
    const validBackendMode = (paymentMode === 'QR_CODE') ? 'UPI' : paymentMode;

    const payload = {
      paymentMode: validBackendMode,
      amount: amount,
      paymentProof: extras?.paymentProof || null,
      isPayAtCounter: extras?.isPayAtCounter || false,
      status: 'SUCCESS', // Legacy/ignored
      transactionId: `TXN_${Date.now()}` // Legacy/ignored
    };

    return this.http.post<any>(`${this.apiUrl}/${orderId}/pay`, payload).pipe(
      tap(updatedOrder => {
        // Update local state
        const current = this.ordersSubject.value;
        const index = current.findIndex(o => o.id === orderId);
        if (index !== -1) {
          // If PayAtCounter, status is PENDING. If Proof, status is VERIFICATION_PENDING?
          // We can use the response from backend to update correctly,
          // but for optimistic UI we might want to be careful.
          // Let's just use the backend response logic (refresh or partial update).
          // For now, simple optimistic update:
          const newStatus = (extras?.isPayAtCounter) ? 'PENDING' : (extras?.paymentProof ? 'VERIFICATION_PENDING' : 'PAID');

          // We need to cast 'VERIFICATION_PENDING' to any or update local model if strict
          current[index] = {
            ...current[index],
            paymentStatus: newStatus as any, // Update payment status
            paymentMode
          };
          this.ordersSubject.next([...current]);
        }
      })
    );
  }

  verifyPayment(orderId: number): Observable<any> {
    const tenantId = this.tenantService.getTenantId();
    let params = new HttpParams();
    // Headers are handled by interceptor, but we might need to ensure consistency?
    // The endpoint uses PathVariable for ID.
    return this.http.post<any>(`${this.apiUrl}/${orderId}/verify-payment`, {}).pipe(
      tap(updatedOrder => {
        // Optimistic Update
        const current = this.ordersSubject.value;
        const index = current.findIndex(o => o.id === orderId);
        if (index !== -1) {
          // Update status to CONFIRMED and paymentStatus to PAID
          current[index] = {
            ...current[index],
            status: 'CONFIRMED' as any,
            paymentStatus: 'PAID',
            paidAt: new Date().toISOString()
          };
          this.ordersSubject.next([...current]);
        }
      })
    );
  }

  /**
   * Sync Mechanism
   */
  private async syncOfflineOrders() {
    const pending = await this.offlineService.getPendingOrders();
    if (pending.length === 0) return;

    this.toastr.info(`Syncing ${pending.length} offline orders...`, 'Connectivity Restored');

    const idsToDelete: number[] = [];

    // Process sequentially to respect order
    for (const order of pending) {
      try {
        // Remove offline-specific fields
        const { offlineStatus, id, ...payload } = order;

        await this.http.post(this.apiUrl, payload).toPromise();

        if (id) idsToDelete.push(id); // IndexedDB ID
      } catch (err) {
        console.error('Sync failed for order', order, err);
        // Keep in DB to try again later? Or mark as failed?
      }
    }

    if (idsToDelete.length > 0) {
      await this.offlineService.clearProcessedOrders(idsToDelete);
      this.toastr.success('Offline orders synced successfully!', 'Sync Complete');
      this.loadOrders(); // Refresh list
    }
  }
}
