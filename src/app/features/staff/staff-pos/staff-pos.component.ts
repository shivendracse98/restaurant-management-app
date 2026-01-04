import { Component, OnInit, OnDestroy } from '@angular/core';
// Re-trigger compile
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, timer, forkJoin } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { OrderService } from '../../../core/services/order.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { MenuService } from '../../../core/services/menu.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LeaveService, LeaveResponse } from '../../../core/services/leave.service';
import { ConfigService, PaymentConfig } from '../../../core/services/config.service';
import { FoodItem } from '../../../models/food-item.model';
import { Subscription as TiffinModel } from '../../../models/subscription.model';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { PosOrderTakingComponent } from './components/pos-order-taking/pos-order-taking.component';
import { PosOngoingOrdersComponent } from './components/pos-ongoing-orders/pos-ongoing-orders.component';
import { PosTiffinComponent } from './components/pos-tiffin/pos-tiffin.component';

@Component({
  selector: 'app-staff-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgChartsModule,
    PosOrderTakingComponent,
    PosOngoingOrdersComponent,
    PosTiffinComponent
  ],
  templateUrl: './staff-pos.component.html',
  styleUrls: ['./staff-pos.component.scss']
})
export class StaffPosComponent implements OnInit, OnDestroy {
  // Tabs
  activeTab: 'ORDER' | 'TIFFIN' | 'ONGOING' | 'REVENUE' | 'ONLINE' | 'LEAVES' | 'UNPAID' = 'ORDER';

  // Data
  menuItems: FoodItem[] = [];
  subscriptionsList: TiffinModel[] = [];
  todayOrders: any[] = [];
  ongoingOrders: any[] = [];
  onlineOrders: any[] = [];
  unpaidOrders: any[] = []; // New
  myLeaves: LeaveResponse[] = []; // New

  paymentConfig: PaymentConfig | null = null;
  paymentMode: string = 'CASH';
  pendingTiffinPayload: TiffinModel | null = null;

  // UI state
  message = '';
  isLoading = false;
  showEditModal = false;
  showLeaveModal = false; // New
  editOrder: any = null;
  isManageMode = false; // Toggle for stock management

  // forms
  // search
  searchTerm = '';

  // Cart UI
  showCartModal = false; // ✅ New UI State for Floating Cart

  toggleCart(): void {
    // If opening, maybe focus or something, but simple toggle is enough
    this.showCartModal = !this.showCartModal;
  }

  // forms
  orderForm = this.fb.group({
    customerName: ['Walk-in Guest', Validators.required],
    customerPhone: ['0000000000'],
    address: ['Restaurant'],
    orderType: ['DINE_IN', Validators.required],
    tableNumber: ['', Validators.required], // ✅ REQUIRED
    items: [[] as FoodItem[]]
  });

  leaveForm = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reason: ['', Validators.required]
  });



  // chart data (ng2-charts)
  revenueChartLabels: string[] = [];
  revenueChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  revenueChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      title: {
        display: true,
        text: 'Last 7 Days Revenue',
        font: { size: 14 } as any
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true }
    }
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    private subscriptionService: SubscriptionService,
    private menuService: MenuService,
    private auth: AuthService,
    private notificationService: NotificationService,
    private configService: ConfigService,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private leaveService: LeaveService
  ) { }

  ngOnInit(): void {
    this.loadMenu();
    this.loadSubscriptions();

    // ✅ Reactively update lists whenever Orders change
    this.orderService.orders$.pipe(takeUntil(this.destroy$)).subscribe(orders => {
      this.processOrders(orders);
    });

    // ✅ Active Polling: Fetch new data every 5s (Near Real-time)
    timer(0, 5000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          const tasks: import('rxjs').Observable<any>[] = [this.orderService.refreshOrders()];
          if (this.activeTab === 'LEAVES') {
            tasks.push(this.leaveService.getMyLeaves());
          }
          return forkJoin(tasks);
        })
      ).subscribe((results: any[]) => {
        if (results.length > 1 && results[1]) {
          this.myLeaves = results[1];
        }
      });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((qp: any) => {
      if (qp['tab'] === 'orders') this.activeTab = 'REVENUE';
      else if (qp['tab'] === 'tiffin') this.activeTab = 'TIFFIN';
      else if (qp['tab'] === 'ongoing') this.activeTab = 'ONGOING';
      else this.activeTab = 'ORDER';
    });

    this.configService.getPaymentConfig().subscribe(config => {
      if (config) {
        this.paymentConfig = config;
        if (config.defaultPaymentMode === 'UPI') {
          this.paymentMode = 'UPI';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMenu(): void {
    this.menuService.getAllMenuItems().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.menuItems = data || [];
        // Child handles filtering now
      },
      error: (err: any) => console.error('Menu load error', err)
    });
  }

  loadSubscriptions(): void {
    this.subscriptionService.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.subscriptionsList = data || [];
      },
      error: (err: any) => console.error('Subscriptions load failed', err)
    });
  }

  processOrders(all: any[]): void {
    const arr = Array.isArray(all) ? all : [];
    const today = new Date().toISOString().split('T')[0];

    this.todayOrders = arr.filter((o: any) => (o.createdAt || '').startsWith(today));
    this.prepareRevenueChart();

    this.onlineOrders = arr.filter((o: any) => {
      const status = o.status || 'PENDING';
      const paymentStatus = o.paymentStatus || 'PENDING';
      const needsVerification = paymentStatus === 'VERIFICATION_PENDING';
      const payAtCounter = o.paymentMode === 'CASH' && status === 'PENDING';
      return needsVerification || payAtCounter;
    });

    this.ongoingOrders = arr.filter((o: any) => {
      const status = o.status || 'PENDING';
      const paymentStatus = o.paymentStatus || 'PENDING';
      const isUnverified = paymentStatus === 'VERIFICATION_PENDING' || (o.paymentMode === 'CASH' && status === 'PENDING');
      return !isUnverified &&
        status !== 'CANCELLED' &&
        status !== 'COMPLETED' &&
        status !== 'DELIVERED' &&
        status !== 'PAID';
    });

    this.unpaidOrders = arr.filter((o: any) => {
      const status = o.status || 'PENDING';
      const paymentStatus = o.paymentStatus || 'PENDING';
      const isServed = status === 'DELIVERED';
      const isNotPaid = paymentStatus !== 'PAID' && paymentStatus !== 'COMPLETED';
      return isServed && isNotPaid;
    });
  }

  loadTodayOrders() { this.orderService.refreshOrders().subscribe(); }
  loadOngoingOrders() { this.orderService.refreshOrders().subscribe(); }

  verifyPayment(order: any): void {
    if (!confirm(`Verify payment for Order #${order.id}?`)) return;

    this.orderService.verifyPayment(order.id).subscribe({
      next: () => {
        this.toastr.success('✅ Payment Verified! Order moved to Ongoing.');
        this.loadOngoingOrders();
      },
      error: (err) => {
        console.error('❌ Verification failed', err);
        this.toastr.error('Verification failed.');
      }
    });
  }

  get cartItems(): FoodItem[] {
    return (this.orderForm.value.items as FoodItem[]) || [];
  }

  // Sorted Order Logic moved to Child Component

  get filteredMenu(): FoodItem[] {
    const term = (this.searchTerm || '').toLowerCase().trim();
    if (!term) return this.menuItems;
    return this.menuItems.filter((m: FoodItem) =>
      (m.name || '').toLowerCase().includes(term) ||
      (m.category || '').toLowerCase().includes(term)
    );
  }

  get subscriptionsCount(): number {
    return (this.subscriptionsList || []).filter((s: any) => s.status === 'ACTIVE').length;
  }

  addItem(item: FoodItem): void {
    if (this.isManageMode) {
      const newStatus = !item.isAvailable;
      this.menuService.updateAvailability(item.id, newStatus).subscribe({
        next: (updated) => {
          const idx = this.menuItems.findIndex(m => m.id === updated.id);
          if (idx !== -1) this.menuItems[idx] = updated;
          this.toastr.success(`${updated.name} is now ${updated.isAvailable ? 'In Stock' : 'Out of Stock'}`);
        },
        error: () => this.toastr.error('Failed to update stock status')
      });
      return;
    }

    const current = this.orderForm.value.items || [];
    this.orderForm.patchValue({ items: [...current, item] });
    this.toastr.success(`✓ ${item.name} added`, '', { timeOut: 1200, positionClass: 'toast-bottom-center' });
  }

  removeItemFromOrder(index: number): void {
    const items = [...(this.orderForm.value.items || [])];
    items.splice(index, 1);
    this.orderForm.patchValue({ items });
  }

  getTotal(items?: FoodItem[] | null): number {
    if (!items || !items.length) return 0;
    return items.reduce((s: number, i: FoodItem) => s + (i.price || 0), 0);
  }

  clearCart(): void {
    this.orderForm.reset({
      customerName: 'Walk-in Guest',
      customerPhone: '0000000000',
      address: 'Restaurant',
      orderType: 'DINE_IN',
      tableNumber: '', // Added tableNumber reset
      items: []
    });
    this.message = '🗑️ Cart cleared';
    setTimeout(() => (this.message = ''), 1500);
  }

  // ... (rest of vars)

  // ...

  // ========== SHARED TABLE CONFLICT LOGIC ==========
  showConflictModal = false;
  conflictOrders: any[] = [];
  pendingNewItems: any[] = []; // Store items while user decides

  placeOrder(): void {
    const items = this.orderForm.value.items || [];
    if (!items.length) {
      this.message = '⚠️ Please add at least one item';
      return;
    }

    const tableNumStr = this.orderForm.value.tableNumber;
    if (tableNumStr === null || tableNumStr === undefined || tableNumStr === '') {
      this.message = '⚠️ Table Number is Required (Use 0 for No Table)';
      return;
    }

    const tableNum = Number(tableNumStr);

    // Map items to payload format
    this.pendingNewItems = items.map((i: FoodItem) => ({
      id: i.id,
      menuItemId: i.id,
      qty: 1,
      price: i.price,
      name: i.name
    }));

    // 1. Check for Active Orders on this Table
    let activeOrdersOnTable: any[] = [];
    if (tableNum > 0) {
      // Find ALL active orders for this table (Ongoing + Unpaid)
      const ongoing = this.ongoingOrders.filter(o => Number(o.tableNumber) === tableNum);
      const unpaid = this.unpaidOrders.filter(o => Number(o.tableNumber) === tableNum);

      // Merge unique by ID
      const map = new Map();
      ongoing.forEach(o => map.set(o.id, o));
      unpaid.forEach(o => map.set(o.id, o));
      activeOrdersOnTable = Array.from(map.values());
    }

    // 2. Decide Flow
    if (activeOrdersOnTable.length > 0) {
      // --- CONFLICT DETECTED ---
      console.log(`⚠️ Table ${tableNum} has ${activeOrdersOnTable.length} active orders. Prompting user.`);
      this.conflictOrders = activeOrdersOnTable;
      this.showConflictModal = true;
      // Close Cart Modal temporarily effectively (visual only, logic waits)
      this.showCartModal = false;
    } else {
      // --- NO CONFLICT ---
      this.executeCreateNewOrder(tableNum);
    }
  }

  // Option A: User selected "Start New Bill"
  confirmNewBill(): void {
    const tableNum = Number(this.orderForm.value.tableNumber);
    this.executeCreateNewOrder(tableNum);
    this.closeConflictModal();
  }

  // Option B: User selected "Append to Order #ID"
  confirmAppend(existingOrder: any): void {
    this.executeAppendOrder(existingOrder);
    this.closeConflictModal();
  }

  closeConflictModal(): void {
    this.showConflictModal = false;
    this.conflictOrders = [];
    this.pendingNewItems = []; // Clear stash ? No, keep form state in case they cancel? 
    // Actually if they cancel modal, they might want to go back to cart.
    // For now simple close.
    this.showCartModal = true; // Re-open cart if they cancel conflict decision?
  }

  private executeCreateNewOrder(tableNum: number): void {
    this.isLoading = true;
    console.log('✨ Creating NEW Order for Table', tableNum);

    const payload: any = {
      customerName: this.orderForm.value.customerName || 'Walk-in Guest',
      customerPhone: this.orderForm.value.customerPhone || '0000000000',
      address: this.orderForm.value.address || 'Restaurant',
      orderType: this.orderForm.value.orderType || 'DINE_IN',
      tableNumber: tableNum.toString(),
      items: this.pendingNewItems,
      total: this.pendingNewItems.reduce((s: number, m: any) => s + (m.price || 0) * (m.qty || 1), 0),
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    this.orderService.createOrder(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.finishOrderPlacement('✅ Order placed successfully'),
      error: (err: any) => {
        console.error('Place order error', err);
        this.message = '❌ Failed to place order';
        this.isLoading = false;
      }
    });
  }

  private executeAppendOrder(existingOrder: any): void {
    this.isLoading = true;
    console.log('🔄 Appending to existing Order #', existingOrder.id);

    // Merge logic
    const combinedItems = [...(existingOrder.items || [])];

    this.pendingNewItems.forEach(newItem => {
      const newItemStatus = 'PREPARING';
      const existingItemIndex = combinedItems.findIndex((ex: any) =>
        ex.menuItemId === newItem.menuItemId &&
        (ex.status || 'PREPARING') === newItemStatus
      );

      if (existingItemIndex >= 0) {
        combinedItems[existingItemIndex].qty = (combinedItems[existingItemIndex].qty || 1) + 1;
      } else {
        combinedItems.push({ ...newItem, status: newItemStatus });
      }
    });

    const newTotal = combinedItems.reduce((s: number, it: any) => s + (it.price || 0) * (it.qty || 1), 0);

    const finalItemsPayload = combinedItems.map((item: any) => ({
      menuItemId: item.menuItemId || item.id,
      itemName: item.itemName || item.name,
      quantity: item.quantity || item.qty || 1,
      pricePerUnit: item.pricePerUnit || item.price || 0,
      subtotal: (item.quantity || item.qty || 1) * (item.pricePerUnit || item.price || 0),
      status: item.status || 'PREPARING'
    }));

    const updatePayload = {
      items: finalItemsPayload,
      totalAmount: newTotal,
      updatedBy: this.auth.currentUser()?.name || 'Staff',
      updatedAt: new Date().toISOString()
    };

    this.orderService.updateOrder(existingOrder.id, updatePayload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.finishOrderPlacement('✅ Items added to Order #' + existingOrder.id);
      },
      error: (err) => {
        console.error('Append failed', err);
        this.message = '❌ Failed to append to order';
        this.isLoading = false;
      }
    });
  }

  private finishOrderPlacement(msg: string): void {
    this.message = msg;
    this.isLoading = false;
    // Clear items but KEEP Table Number (likely to add more for same table or diff table?)
    // User Requirement: "make table number mandatory". Usually reset is safer.
    this.orderForm.reset({
      customerName: 'Walk-in Guest',
      customerPhone: '0000000000',
      address: 'Restaurant',
      orderType: 'DINE_IN',
      tableNumber: '', // Reset table too
      items: []
    });
    // Close modal if open (will implement next)
    this.showCartModal = false;

    this.loadOngoingOrders();
    this.loadTodayOrders();
  }

  // ========== TIFFIN MANAGEMENT ==========

  // Removed Local Tiffin Logic (Moved to PosTiffinComponent)

  createSubscription(payload: TiffinModel): void {
    if (!payload) return;

    this.pendingTiffinPayload = payload;

    // Open Payment Modal with mapped fields
    this.openPayment({
      id: 'NEW-SUB',
      customerName: payload.customerName,
      total: payload.finalAmount,
    });
    this.message = '💰 Proceeding to Payment...';
  }

  // Action: Pause (Start Pause) or Resume (End Pause)
  toggleSubscriptionStatus(sub: TiffinModel): void {
    if (sub.status === 'ACTIVE') {
      // PAUSE: Send FULL object to ensure backend validation passes
      const payload: any = {
        ...sub, // Clone all existing fields
        status: 'PAUSED',
        pausedAt: new Date().toISOString(),
        endDate: sub.endDate,
        totalPausedDays: sub.totalPausedDays
      };

      this.subscriptionService.updateStatus(sub.id!, payload).subscribe({
        next: () => {
          this.message = '⏸ Subscription Paused';
          this.loadSubscriptions();
        },
        error: (err: any) => {
          console.error('Pause failed', err);
          this.loadSubscriptions(); // Reload to revert UI state if failed
          this.message = '❌ Failed to pause subscription';
        }
      });
    } else if (sub.status === 'PAUSED' && sub.pausedAt) {
      // RESUME logic
      const pausedDate = new Date(sub.pausedAt);
      const now = new Date();
      // Diff in days
      const diffTime = Math.abs(now.getTime() - pausedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const newTotalPaused = (sub.totalPausedDays || 0) + diffDays;

      // Calculate new End Date
      const currentEnd = new Date(sub.endDate);
      currentEnd.setDate(currentEnd.getDate() + diffDays);

      // Check Max Limit
      const maxEnd = new Date(sub.maxEndDate);
      const finalEnd = currentEnd > maxEnd ? maxEnd : currentEnd;

      const payload: any = {
        ...sub, // Clone all existing fields
        status: 'ACTIVE',
        pausedAt: null, // Send null to clear on backend
        totalPausedDays: newTotalPaused,
        endDate: finalEnd.toISOString().split('T')[0]
      };

      this.subscriptionService.updateStatus(sub.id!, payload).subscribe({
        next: () => {
          this.message = `✅ Resumed! Extended by ${diffDays} days.`;
          this.loadSubscriptions();
        },
        error: (err: any) => {
          console.error('Resume failed', err);
          this.loadSubscriptions();
          this.message = '❌ Failed to resume subscription';
        }
      });
    }
  }

  // ========== ONGOING ORDERS (EDIT/MARK PAID) ==========

  openEdit(order: any): void {
    this.editOrder = JSON.parse(JSON.stringify(order || {}));
    // Fix: Normalize existing items for Frontend form usage (pricePerUnit -> price)
    this.editOrder.items = (this.editOrder.items || []).map((it: any) => ({
      ...it,
      name: it.itemName || it.name, // Ensure 'name' exists for UI
      price: it.pricePerUnit || it.price, // Ensure 'price' exists for Total Calc
      qty: it.qty || it.quantity || 1
    }));
    this.showEditModal = true;
    setTimeout(() => {
      const el = document.querySelector('.modal-backdrop');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  closeEdit(): void {
    this.showEditModal = false;
    this.editOrder = null;
  }

  addItemToEdit(item: FoodItem): void {
    if (!this.editOrder) return;
    const idx = (this.editOrder.items || []).findIndex((x: any) => x.menuItemId === item.id);
    if (idx >= 0) {
      this.editOrder.items[idx].qty = (this.editOrder.items[idx].qty || 0) + 1;
    } else {
      (this.editOrder.items ||= []).push({ menuItemId: item.id, name: item.name, qty: 1, price: item.price });
    }
  }

  removeItemFromEdit(idx: number): void {
    if (!this.editOrder) return;
    this.editOrder.items.splice(idx, 1);
  }

  increaseQty(i: any): void {
    if (i) i.qty = (i.qty || 0) + 1;
  }

  decreaseQty(i: any): void {
    if (i) i.qty = Math.max(1, (i.qty || 1) - 1);
  }

  saveEdit(): void {
    if (!this.editOrder || !this.editOrder.id) return;

    // Fix: Normalize Payload for Backend (name -> itemName, price -> pricePerUnit)
    const normalizedItems = (this.editOrder.items || []).map((it: any) => ({
      menuItemId: it.menuItemId || it.id, // Ensure ID
      itemName: it.name || it.itemName,   // Ensure Name (Validation)
      quantity: it.qty || it.quantity || 1,
      pricePerUnit: it.price || it.pricePerUnit, // Ensure Price
      subtotal: (it.qty || 1) * (it.price || it.pricePerUnit || 0),
      status: it.status // Preserve status
    }));

    const payload: any = {
      items: normalizedItems,
      // Fix: Calculate total using whatever price field is available
      totalAmount: normalizedItems.reduce((s: number, it: any) => s + (it.subtotal || 0), 0),
      updatedBy: this.auth.currentUser()?.name || 'Staff',
      updatedAt: new Date().toISOString()
    };

    this.orderService.updateOrder(this.editOrder.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.message = '✅ Order updated';
        this.showEditModal = false;
        this.editOrder = null;
        this.loadOngoingOrders();
        this.loadTodayOrders();
      },
      error: (err: any) => {
        console.error('Update order failed', err);
        this.message = '❌ Failed to update order';
      }
    });
  }

  // ========== BILLING / NOTIFICATION ==========

  // ========== BILLING / NOTIFICATION ==========
  showBillModal = false;
  viewBillOrder: any = null;

  shareBill(order: any): void {
    // Renamed from shareBill to openBillModal logic broadly, keeping method name 'shareBill' for template compatibility if needed, 
    // but effectively this now opens the modal.
    this.viewBillOrder = order;
    this.showBillModal = true;
  }

  closeBillModal(): void {
    this.showBillModal = false;
    this.viewBillOrder = null;
  }

  confirmShare(mode: 'WHATSAPP' | 'SMS'): void {
    if (!this.viewBillOrder) return;

    const order = this.viewBillOrder;
    const phone = order.customerPhone || '0000000000';

    const itemsList = (order.items || [])
      .map((i: any) => `${i.qty}x ${i.name} (₹${i.price})`)
      .join('\n');

    // Construct bill text
    const message =
      `🧾 *Bill for Order #${order.id}*\n` +
      `--------------------------------\n` +
      `Hello ${order.customerName || 'Guest'},\n` +
      `Here is your order summary:\n\n` +
      `${itemsList}\n` +
      `--------------------------------\n` +
      `*Total: ₹${order.total}*\n` +
      `--------------------------------\n` +
      `Thank you for dining with TasteTown! 🍽️`;

    if (mode === 'WHATSAPP') {
      this.notificationService.shareViaWhatsApp(phone, message);
    } else {
      this.notificationService.shareViaSMS(phone, message);
    }

    this.message = `🚀 Opening ${mode}...`;
    this.closeBillModal();
  }

  // ========== CHART / REVENUE ==========

  prepareRevenueChart(): void {
    const days: Record<string, number> = {};

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }

    (this.todayOrders || []).forEach((o: any) => {
      const key = (o.createdAt || '').split('T')[0];
      if (key in days) days[key] += Number(o.total || 0);
    });

    this.revenueChartLabels = Object.keys(days);
    this.revenueChartData = {
      labels: this.revenueChartLabels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: Object.values(days) as number[],
          backgroundColor: '#E67E22',
          borderColor: '#D97706',
          borderWidth: 1
        }
      ]
    };
  }

  getTodayRevenueTotal(): number {
    return (this.todayOrders || []).reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
  }

  getCashOrdersCount(): number {
    return (this.todayOrders || []).filter((o: any) => o.paymentMode === 'CASH').length;
  }

  getOnlineOrdersCount(): number {
    return (this.todayOrders || []).filter((o: any) => o.paymentMode !== 'CASH').length;
  }

  // ========== SWITCH TAB ==========

  switchTab(tab: 'ORDER' | 'TIFFIN' | 'ONGOING' | 'REVENUE' | 'ONLINE' | 'LEAVES' | 'UNPAID'): void {
    this.activeTab = tab;
    this.message = '';
    if (tab === 'REVENUE') this.loadTodayOrders();
    if (tab === 'ONGOING') this.loadOngoingOrders();
    if (tab === 'UNPAID') this.loadOngoingOrders(); // Refresh orders
    if (tab === 'LEAVES') this.loadMyLeaves();
  }

  markAsServed(order: any): void {
    if (!order || !order.id) return;
    this.orderService.updateOrderStatus(order.id, 'DELIVERED').pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.message = '✅ Order marked as SERVED';
        this.loadOngoingOrders();
      },
      error: (err: any) => {
        console.error('Update status failed', err);
        this.message = '❌ Failed to update status';
      }
    });
  }

  // ========== PAYMENT CONFIRMATION ==========
  showPaymentModal = false;
  payOrder: any = null;

  openPayment(order: any): void {
    this.payOrder = order;
    this.paymentMode = 'CASH';
    this.showPaymentModal = true;
  }

  closePayment(): void {
    this.showPaymentModal = false;
    this.payOrder = null;
  }

  confirmPayment(): void {
    // 1. Handle Tiffin Subscription Payment
    if (this.pendingTiffinPayload) {
      this.isLoading = true;
      // In a real app, you might record the payment transaction separately here.
      // For now, we assume creation implies paid/active status as per current schema.

      this.subscriptionService.create(this.pendingTiffinPayload).subscribe({
        next: () => {
          this.message = `✅ Subscription Active! Paid via ${this.paymentMode}`;
          this.isLoading = false;
          this.pendingTiffinPayload = null;
          this.closePayment();

          this.closePayment();

          // Form reset handled by child or user
          this.loadSubscriptions();
        },
        error: (err: any) => {
          console.error('Subscription creation failed', err);
          this.message = '❌ Failed to create subscription';
          this.isLoading = false;
        }
      });
      return;
    }

    // 2. Handle Regular Order Payment
    if (!this.payOrder) return;

    // Call new Pay endpoint
    this.orderService.payOrder(this.payOrder.id, this.paymentMode, this.payOrder.totalAmount || this.payOrder.total).subscribe({
      next: () => {
        this.message = `💰 Payment Confirmed (${this.paymentMode})`;
        this.closePayment();
        this.loadOngoingOrders(); // Refresh to remove 'PAID' order
        this.loadTodayOrders(); // Refresh revenue
      },
      error: (err: any) => {
        console.error('Payment failed', err);
        this.message = '❌ Payment failed';
      }
    });
  }

  // Helper to parse notes
  private extractMetadata(notes: string): any {
    try {
      if (notes && notes.startsWith('{')) {
        return JSON.parse(notes);
      }
    } catch (e) { }
    return { originalNotes: notes };
  }

  trackByItem(_index: number, item: FoodItem): number {
    return item.id;
  }

  // ========== LEAVE MANAGEMENT ==========

  loadMyLeaves(): void {
    this.leaveService.getMyLeaves().subscribe({
      next: (leaves: LeaveResponse[]) => this.myLeaves = leaves,
      error: () => this.toastr.error('Failed to load leave history')
    });
  }

  openLeaveModal(): void {
    this.showLeaveModal = true;
  }

  getLeaveDuration(start: string, end: string): number {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include start date
  }

  closeLeaveModal(): void {
    this.showLeaveModal = false;
    this.leaveForm.reset();
  }

  applyForLeave(): void {
    if (this.leaveForm.invalid) return;

    this.isLoading = true;
    const val = this.leaveForm.value;

    // Ensure dates are strings for API (YYYY-MM-DD)
    const payload = {
      startDate: val.startDate!,
      endDate: val.endDate!,
      reason: val.reason!
    };

    this.leaveService.apply(payload).subscribe({
      next: () => {
        this.toastr.success('Leave application submitted');
        this.closeLeaveModal();
        this.loadMyLeaves();
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Leave Apply Error:', err);
        this.toastr.error(err.error?.message || 'Failed to apply for leave');
        this.isLoading = false;
      }
    });
  }
}
