
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { BehaviorSubject, Observable, from, of, catchError, switchMap, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { NetworkService } from './network.service';
import { OfflineService } from './offline.service';
import { Order } from '../../models/order.model';

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
    private toastr: ToastrService
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
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  loadOrders(): void {
    if (this.networkService.isOnline) {
      this.http.get<any[]>(this.apiUrl).pipe(
        // Map backend response architecture to frontend model
        switchMap(orders => {
          const mapped = orders.map(o => {
            // Try parse metadata from notes
            let metadata: any = {};
            try {
              if (o.notes && o.notes.startsWith('{')) {
                metadata = JSON.parse(o.notes);
              }
            } catch (e) { /* ignore */ }

            return {
              ...o,
              ...metadata, // Spread metadata (tableNumber, customerName, etc.)
              total: o.totalAmount || o.total, // Map backend totalAmount to frontend total
              // Ensure items are mapped correctly
              items: (o.items || []).map((i: any) => ({
                menuItemId: i.menuItemId,
                qty: i.quantity || i.qty,
                name: i.itemName || i.name,
                price: i.pricePerUnit || i.price
              }))
            };
          });
          return of(mapped);
        }),
        tap(orders => this.ordersSubject.next(orders)),
        catchError(err => {
          console.error('Failed to load orders', err);
          return of([]);
        })
      ).subscribe();
    } else {
      // Could load cached orders here if we were caching GET requests too
      // For now, we trust what we have or user sees empty/stale
    }
  }

  createOrder(order: any): Observable<any> {
    // Pack metadata into notes since backend API lacks these fields
    const metadata = {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      tableNumber: order.tableNumber,
      orderType: order.orderType,
      address: order.address,
      restaurantId: order.restaurantId,
      originalNotes: order.notes // Keep real notes if any
    };

    // Map frontend model to API request model
    const payload = {
      items: order.items.map((i: any) => ({
        menuItemId: i.menuItemId || i.id, // Handle both cases safely
        itemName: i.name || i.itemName, // Handle both name fields
        quantity: i.qty,
        pricePerUnit: i.price,
        subtotal: i.qty * i.price
      })),
      totalAmount: order.total,
      notes: JSON.stringify(metadata)
    };

    if (this.networkService.isOnline) {
      return this.http.post<any>(this.apiUrl, payload).pipe(
        tap(newOrder => {
          // Re-attach metadata for local cache update consistency
          const orderWithMeta = {
            ...newOrder,
            ...metadata,
            total: newOrder.totalAmount || payload.totalAmount
          };
          // Ensure items are also mapped for immediate UI update
          orderWithMeta.items = (newOrder.items || payload.items).map((i: any) => ({
            menuItemId: i.menuItemId,
            qty: i.quantity || i.qty,
            name: i.itemName || i.name,
            price: i.pricePerUnit || i.price
          }));

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
    // This generic update might not exist in backend, specifically update status
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, null, { params: { status: data.status } }).pipe(
      tap(() => {
        // Optimistic update
        const current = this.ordersSubject.value;
        const index = current.findIndex(o => o.id == id);
        if (index > -1) {
          current[index] = { ...current[index], ...data };
          this.ordersSubject.next([...current]);
        }
      })
    );
  }

  updateOrderStatus(id: number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, null, { params: { status } }).pipe(
      tap(() => {
        const current = this.ordersSubject.value;
        const index = current.findIndex(o => o.id == id);
        if (index > -1) {
          current[index].status = status as any;
          this.ordersSubject.next([...current]);
        }
      })
    );
  }

  payOrder(orderId: number, paymentMode: string, amount: number): Observable<any> {
    console.log(`Paying order ${orderId} with ${paymentMode} - Amount: ${amount}`);
    return this.http.post<any>(`${this.apiUrl}/${orderId}/pay`, { paymentMode, amount }).pipe(
      tap(updatedOrder => {
        // Update local state
        const current = this.ordersSubject.value;
        const index = current.findIndex(o => o.id === orderId);
        if (index !== -1) {
          current[index] = { ...current[index], status: 'PAID' as any, paymentMode }; // Optimistic update
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
