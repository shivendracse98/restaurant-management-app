
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
      this.http.get<Order[]>(this.apiUrl).pipe(
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
    if (this.networkService.isOnline) {
      return this.http.post<any>(this.apiUrl, order).pipe(
        tap(newOrder => {
          const current = this.ordersSubject.value;
          this.ordersSubject.next([...current, newOrder]);
          // this.toastr.success('Order placed successfully'); // Let component handle success API
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
    return this.http.patch<any>(`${this.apiUrl}/${id}`, data).pipe(
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
    return this.updateOrder(id, { status });
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
