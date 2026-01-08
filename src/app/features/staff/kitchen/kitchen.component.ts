

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { Order } from '../../../models/order.model';
import { ToastrService } from 'ngx-toastr';
import { Subject, timer } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="kitchen-container">
      <div class="header">
        <div style="display: flex; gap: 15px; align-items: center;">
          <h2>👨‍🍳 Kitchen Display System (KDS) <span class="live-badge" *ngIf="isLive">⚡ LIVE</span></h2>
          <a routerLink="/staff/pos" class="btn" style="width: auto; background: #e5e7eb; color: #374151; text-decoration: none;">
            ⬅️ Back to POS
          </a>
        </div>
        <div class="last-updated">Last updated: {{ lastUpdated | date:'mediumTime' }}</div>
      </div>

      <div class="board">
        <!-- COLUMN 1: NEW / PENDING -->
        <div class="column new">
          <div class="col-header">
            <h3>🔔 New Orders ({{ pendingOrders.length }})</h3>
          </div>
          <div class="order-list">
            <div *ngFor="let order of pendingOrders" class="order-card fade-in">
              <div class="card-header">
                <span class="order-id">#{{ order.id }}</span>
                <span class="time">{{ order.createdAt | date:'shortTime' }}</span>
              </div>
              <div class="items">
                <div *ngFor="let item of order.items" class="item">
                  <span class="qty">{{ item.qty }}x</span> {{ item.name }}
                </div>
              </div>
              <div class="actions">
                <button class="btn start-btn" (click)="updateStatus(order, 'PREPARING')">🔥 Start Cooking</button>
              </div>
            </div>
            <div *ngIf="pendingOrders.length === 0" class="empty-state">No new orders</div>
          </div>
        </div>

        <!-- COLUMN 2: PREPARING -->
        <div class="column preparing">
          <div class="col-header">
            <h3>🍳 Preparing ({{ preparingOrders.length }})</h3>
          </div>
          <div class="order-list">
            <div *ngFor="let order of preparingOrders" class="order-card">
              <div class="card-header">
                <span class="order-id">#{{ order.id }}</span>
                <span class="time">{{ order.createdAt | date:'shortTime' }}</span>
              </div>
              <div class="items">
                  <div *ngFor="let item of order.items" class="item" 
                       [style.color]="item.status === 'PREPARING' ? '#d97706' : '#059669'"
                       [style.fontWeight]="item.status === 'PREPARING' ? 'bold' : 'normal'">
                    <span class="qty">{{ item.qty }}x</span> {{ item.name }}
                    <small *ngIf="item.status === 'PREPARING'"> (🕒 Prep)</small>
                    <small *ngIf="item.status === 'READY'"> (✅ Ready)</small>
                  </div>
              </div>
              <div class="actions">
                <button class="btn ready-btn" (click)="updateStatus(order, 'READY')">✅ Mark Ready</button>
              </div>
            </div>
            <div *ngIf="preparingOrders.length === 0" class="empty-state">Nothing cooking right now</div>
          </div>
        </div>

        <!-- COLUMN 3: READY -->
        <div class="column ready">
          <div class="col-header">
            <h3>✅ Ready to Serve ({{ readyOrders.length }})</h3>
          </div>
          <div class="order-list">
            <div *ngFor="let order of readyOrders" class="order-card">
              <div class="card-header">
                <span class="order-id">#{{ order.id }}</span>
                <span class="table">
                   {{ order.tableNumber ? 'Table ' + order.tableNumber : 'Takeaway' }}
                </span>
              </div>
              <div class="items">
                <div *ngFor="let item of order.items" class="item">
                  <span class="qty">{{ item.qty }}x</span> {{ item.name }}
                </div>
              </div>
              <div class="actions">
                <button class="btn delivered-btn" (click)="updateStatus(order, 'DELIVERED')">🚀 Served</button>
              </div>
            </div>
            <div *ngIf="readyOrders.length === 0" class="empty-state">No orders waiting</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kitchen-container {
      padding: 20px;
      height: calc(100vh - 64px);
      background-color: #f3f4f6;
      display: flex;
      flex-direction: column;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h2 { margin: 0; color: #1f2937; display: flex; align-items: center; gap: 10px; }
    .live-badge {
        font-size: 0.8rem;
        background: #10b981;
        color: white;
        padding: 2px 8px;
        border-radius: 999px;
        animation: pulse 2s infinite;
    }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
    .last-updated { color: #6b7280; font-size: 0.9rem; }

    .board {
      display: flex;
      gap: 20px;
      flex: 1;
      overflow-x: auto;
    }
    .column {
      flex: 1;
      min-width: 300px;
      background: #e5e7eb;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      max-height: 100%;
    }
    .col-header {
      padding: 15px;
      background: #d1d5db;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      font-weight: bold;
    }
    .col-header h3 { margin: 0; font-size: 1.1rem; }
    
    .new .col-header { background: #fee2e2; color: #991b1b; }
    .preparing .col-header { background: #fef3c7; color: #92400e; }
    .ready .col-header { background: #d1fae5; color: #065f46; }

    .order-list {
      padding: 10px;
      overflow-y: auto;
      flex: 1;
    }
    .empty-state {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
      font-style: italic;
    }

    .order-card {
      background: white;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 15px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-left: 4px solid transparent;
    }
    .new .order-card { border-left-color: #ef4444; }
    .preparing .order-card { border-left-color: #f59e0b; }
    .ready .order-card { border-left-color: #10b981; }

    .card-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-weight: bold;
      color: #374151;
    }
    .items { margin-bottom: 15px; }
    .item { margin-bottom: 4px; color: #4b5563; }
    .qty { font-weight: bold; color: #111827; }

    .btn {
      width: 100%;
      padding: 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.2s;
    }
    .start-btn { background: #fee2e2; color: #b91c1c; }
    .start-btn:hover { background: #fecaca; }

    .ready-btn { background: #fef3c7; color: #b45309; }
    .ready-btn:hover { background: #fde68a; }

    .delivered-btn { background: #d1fae5; color: #047857; }
    .delivered-btn:hover { background: #a7f3d0; }

    .fade-in { animation: fadeIn 0.5s; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    /* KITCHEN RESPONSIVENESS */
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .board {
        flex-direction: column;
        display: block;
        overflow-x: hidden;
        overflow-y: auto;
      }
      .column {
        min-width: 100%;
        margin-bottom: 20px;
        max-height: 500px;
      }
    }
  `]
})
export class KitchenComponent implements OnInit, OnDestroy {
  pendingOrders: Order[] = [];
  preparingOrders: Order[] = [];
  readyOrders: Order[] = [];
  lastUpdated = new Date();
  isLive = false;

  private destroy$ = new Subject<void>();

  constructor(
    private orderService: OrderService,
    private toastr: ToastrService,
    private webSocketService: WebSocketService,
    private auth: AuthService
  ) { }

  ngOnInit() {
    // 1. Initial Load
    this.refreshOrders();
    // 2. Setup WebSocket Live Stream
    this.setupWebSocket();

    // 3. Keep Slow Poll as Safety Net (Every 60s instead of 5s)
    timer(60000, 60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Safety Poll KDS');
        this.refreshOrders();
      });
  }

  setupWebSocket() {
    const user = this.auth.currentUser();
    if (user && user.restaurantId) {
      this.webSocketService.connect();

      // Bind Live Status to actual connection
      this.webSocketService.isConnected()
        .pipe(takeUntil(this.destroy$))
        .subscribe(connected => {
          this.isLive = connected;
          if (connected) console.log('🟢 KDS is Online');
          else console.warn('🔴 KDS is Offline');
        });

      this.webSocketService.subscribe('/topic/restaurant/' + user.restaurantId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((payload) => {
          if (payload) {
            console.log('⚡ KDS Update:', payload);

            // Only beep for New Orders (CONFIRMED)
            if (payload.status === 'CONFIRMED') {
              this.playNotificationSound();
            }

            this.handleRealtimeUpdate(payload);
          }
        });
    }
  }

  refreshOrders() {
    this.orderService.refreshOrders().subscribe({
      next: (orders) => {
        this.processOrders(orders);
        this.lastUpdated = new Date();
      },
      error: (err) => console.error('KDS load error', err)
    });
  }

  handleRealtimeUpdate(payload: any) {
    if (!payload || !payload.id) return;

    // 1. Map Backend DTO -> Frontend Model
    // (The payload has 'quantity'/'itemName', but view expects 'qty'/'name')
    const mappedOrder: Order = {
      ...payload,
      items: (payload.items || []).map((i: any) => ({
        menuItemId: i.menuItemId,
        qty: i.quantity || i.qty,        // Map backend 'quantity' to frontend 'qty'
        name: i.itemName || i.name,      // Map backend 'itemName' to frontend 'name'
        price: i.pricePerUnit || i.price,
        status: i.status
      }))
    };

    console.log('⚡ Mapped Order for KDS:', mappedOrder);

    this.moveOrderLocally(mappedOrder, mappedOrder.status);
    this.lastUpdated = new Date();
    // Removed redundant "Order Updated" toast
  }

  playNotificationSound(): void {
    const audio = new Audio('assets/notification.mp3');
    audio.play().catch(e => console.warn('Audio play blocked', e));
  }

  processOrders(allOrders: Order[]) {
    if (!allOrders) return;

    // Filter out served/cancelled
    const active = allOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED');

    // Mismatched type workaround for strict checking if any
    this.pendingOrders = active.filter(o => (o.status as any) === 'CONFIRMED');
    this.preparingOrders = active.filter(o => o.status === 'PREPARING');
    this.readyOrders = active.filter(o => o.status === 'READY');
  }

  updateStatus(order: Order, newStatus: string) {
    if (!order.id) return;
    this.orderService.updateOrderStatus(order.id, newStatus).subscribe({
      next: () => {
        this.toastr.success(`Order #${order.id} moved to ${newStatus}`, '', { timeOut: 1500 });
        // Optimistic update locally to feel instant
        this.moveOrderLocally(order, newStatus);
      },
      error: () => this.toastr.error('Failed to update status')
    });
  }

  moveOrderLocally(order: Order, newStatus: string) {
    // Remove from current list
    this.pendingOrders = this.pendingOrders.filter(o => o.id !== order.id);
    this.preparingOrders = this.preparingOrders.filter(o => o.id !== order.id);
    this.readyOrders = this.readyOrders.filter(o => o.id !== order.id);

    // Update status
    const updated = { ...order, status: newStatus as any };

    // Add to new list
    if (newStatus === 'CONFIRMED') this.pendingOrders.push(updated); // Backend 'CONFIRMED' = Kitchen 'New'
    else if (newStatus === 'PENDING') { /* Do nothing, wait for verification */ }
    else if (newStatus === 'PREPARING') this.preparingOrders.push(updated);
    else if (newStatus === 'READY') this.readyOrders.push(updated);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
