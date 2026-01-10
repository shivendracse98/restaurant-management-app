import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, timer, forkJoin, of, Observable } from 'rxjs';
import { takeUntil, switchMap, catchError, tap, retry, finalize } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

// ============================================================================
// SERVICES
// ============================================================================
import { OrderService } from '../../../core/services/order.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { MenuService } from '../../../core/services/menu.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LeaveService, LeaveResponse } from '../../../core/services/leave.service';
import { ConfigService, PaymentConfig } from '../../../core/services/config.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { LoggerService } from '../../../core/services/logger.service';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

// ============================================================================
// MODELS & INTERFACES
// ============================================================================
import { FoodItem } from '../../../models/food-item.model';
import { Subscription as TiffinModel } from '../../../models/subscription.model';
import { Order, OrderItem } from '../../../models/order.model';
import { OrderStatus, PaymentStatus } from '../../../models/enums';

// ============================================================================
// CHILD COMPONENTS
// ============================================================================
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { PosOrderTakingComponent } from './components/pos-order-taking/pos-order-taking.component';
import { PosOngoingOrdersComponent } from './components/pos-ongoing-orders/pos-ongoing-orders.component';
import { PosTiffinComponent } from './components/pos-tiffin/pos-tiffin.component';
import { FeatureFlagStore } from '../../../core/feature-flag/feature-flag.store';
import { StaffTodayOrdersComponent } from '../staff-today-orders/staff-today-orders.component';

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD'
}

export enum TabType {
  ORDER = 'ORDER',
  TIFFIN = 'TIFFIN',
  ONGOING = 'ONGOING',
  REVENUE = 'REVENUE',
  ONLINE = 'ONLINE',
  LEAVES = 'LEAVES',
  UNPAID = 'UNPAID',
  TODAY = 'TODAY'
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ConflictModal {
  show: boolean;
  orders: Order[];
  tableNumber?: number;
}


// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const POS_CONFIG = {
  POLLING_INTERVAL_MS: 5000,
  NOTIFICATION_TIMEOUT_MS: 1500,
  MODAL_MAX_HEIGHT_PX: 250,
  CART_WIDTH_PX: 300,
  PHONE_REGEX: /^[6-9]\d{9}$/,
  MAX_TABLE_NUMBER: 100,
  MAX_ITEMS_PER_ORDER: 50,
  ERROR_RETRY_COUNT: 3,
  ERROR_RETRY_DELAY_MS: 1000
} as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

@Component({
  selector: 'app-staff-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgChartsModule,
    PosOrderTakingComponent,
    PosOngoingOrdersComponent,
    PosTiffinComponent,
    StaffTodayOrdersComponent
  ],
  templateUrl: './staff-pos.component.html',
  styleUrls: ['./staff-pos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffPosComponent implements OnInit, OnDestroy {
  // ==================== DEPENDENCIES ====================
  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly menuService = inject(MenuService);
  private readonly auth = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly configService = inject(ConfigService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastr = inject(ToastrService);
  private readonly leaveService = inject(LeaveService);
  private readonly webSocketService = inject(WebSocketService);
  private readonly logger = inject(LoggerService);
  private readonly errorHandler = inject(ErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly featureFlagStore = inject(FeatureFlagStore);

  // ==================== REACTIVE STATE ====================
  private readonly destroy$ = new Subject<void>();

  // ==================== TABS & UI STATE ====================
  // ==================== UI STATE/ENUMS ====================
  // Expose enums to template
  readonly PaymentMode = PaymentMode;
  readonly OrderStatus = OrderStatus;
  readonly TabType = TabType;

  activeTab: TabType = TabType.ORDER;

  message = '';
  isLoading = false;
  showEditModal = false;
  showLeaveModal = false;
  showCartModal = false;
  showBillModal = false;
  showConflictModal = false;
  isManageMode = false;
  showPaymentModal = false;

  // ==================== DATA STATE ====================
  menuItems: FoodItem[] = [];
  subscriptionsList: TiffinModel[] = [];
  todayOrders: Order[] = [];
  ongoingOrders: Order[] = [];
  onlineOrders: Order[] = [];
  unpaidOrders: Order[] = [];
  myLeaves: LeaveResponse[] = [];
  paymentConfig: PaymentConfig | null = null;
  paymentMode: PaymentMode = PaymentMode.CASH;
  editOrder: Order | null = null;
  viewBillOrder: Order | null = null;
  conflictOrders: Order[] = [];
  payOrder: Order | null = null;

  // ==================== FORM STATE ====================
  searchTerm = '';
  pendingNewItems: OrderItem[] = [];
  pendingTiffinPayload: TiffinModel | null = null;

  // ==================== REACTIVE FORMS ====================
  orderForm = this.fb.group({
    customerName: ['Walk-in Guest', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.pattern(POS_CONFIG.PHONE_REGEX)]],
    address: ['Restaurant', [Validators.required, Validators.minLength(3)]],
    pincode: ['', [Validators.minLength(6), Validators.maxLength(6)]],
    orderType: ['DINE_IN', Validators.required],
    tableNumber: ['', Validators.required],
    items: [[] as FoodItem[], Validators.required]
  });

  leaveForm = this.fb.group({
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reason: ['', [Validators.required, Validators.minLength(10)]]
  });

  // ==================== CHART DATA ====================
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

  // ==================== LIFECYCLE ====================

  ngOnInit(): void {
    this.featureFlagStore.loadFlags();
    this.loadInitialData();
    this.setupReactiveUpdates();
    this.setupWebSocket();
    this.setupPolling();
    this.setupFormValidation();
  }

  ngOnDestroy(): void {
    this.webSocketService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== INITIALIZATION ====================

  private loadInitialData(): void {
    this.loadMenu();
    this.loadSubscriptions();
    this.loadPaymentConfig();
    this.loadMyLeaves();

    this.logger.info('Initial data loaded', {
      component: 'StaffPosComponent',
      timestamp: new Date().toISOString()
    });
  }

  private setupReactiveUpdates(): void {
    // Subscribe to order updates
    this.orderService.orders$
      .pipe(
        takeUntil(this.destroy$),
        tap((orders) => this.logger.debug('Orders updated', { count: orders.length }))
      )
      .subscribe((orders) => this.processOrders(orders));

    // Subscribe to query params for tab navigation
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((qp: any) => {
        const tabMap: Record<string, TabType> = {
          orders: TabType.REVENUE,
          tiffin: TabType.TIFFIN,
          ongoing: TabType.ONGOING
        };
        this.activeTab = tabMap[qp['tab']] || TabType.ORDER;
        this.cdr.markForCheck();
      });
  }

  private setupFormValidation(): void {
    // Toggle table number requirement based on order type
    this.orderForm.get('orderType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        const tableCtrl = this.orderForm.get('tableNumber');
        if (type === 'DELIVERY' || type === 'TAKEAWAY') {
          tableCtrl?.clearValidators();
        } else {
          tableCtrl?.setValidators([Validators.required]);
        }
        tableCtrl?.updateValueAndValidity();
      });
  }

  private setupWebSocket(): void {
    const user = this.auth.currentUser();
    if (!user?.restaurantId) {
      this.logger.warn('Cannot setup WebSocket: No user or restaurantId');
      return;
    }

    this.webSocketService.connect();
    this.webSocketService
      .subscribe(`/topic/restaurant/${user.restaurantId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payload) => this.handleWebSocketMessage(payload),
        error: (error) => this.handleWebSocketError(error)
      });
  }

  private setupPolling(): void {
    timer(0, POS_CONFIG.POLLING_INTERVAL_MS)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          const tasks: Observable<any>[] = [this.orderService.getOrders()];

          if (this.activeTab === TabType.LEAVES) {
            tasks.push(this.leaveService.getMyLeaves());
          }

          return forkJoin(tasks)
            .pipe(
              takeUntil(this.destroy$),
              finalize(() => (this.isLoading = false)),
              catchError((err) => {
                this.logger.error('Failed to load data', err);
                this.toastr.error('Failed to refresh data');
                return of([[], []]); // Return empty arrays to prevent breaking the outer stream
              })
            );
        })
      )
      .subscribe((results: any[]) => {
        this.processOrders(results[0] || []);
        if (results[1]) {
          this.myLeaves = results[1];
        }
      });
  }

  // ==================== WEBSOCKET HANDLING ====================

  private handleWebSocketMessage(payload: any): void {
    if (!payload?.id) {
      this.logger.warn('Received invalid WebSocket payload');
      return;
    }

    this.playNotificationSound();
    this.toastr.info('New Order Received! 🔔', '', {
      timeOut: POS_CONFIG.NOTIFICATION_TIMEOUT_MS
    });

    this.orderService.upsertOrderFromWebSocket(payload);
    this.logger.info('Order received via WebSocket', { orderId: payload.id });
  }

  private handleWebSocketError(error: any): void {
    this.logger.error('WebSocket error', { error });
    this.toastr.error('Real-time connection lost. Switching to polling.');
  }

  private playNotificationSound(): void {
    try {
      const audio = new Audio('/assets/notification.mp3');
      audio.play().catch(() => {
        this.logger.warn('Audio notification blocked by browser');
      });
    } catch (error) {
      this.logger.error('Failed to play notification sound', { error });
    }
  }

  // ==================== DATA LOADING ====================

  private loadMenu(): void {
    this.menuService
      .getAllMenuItems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.menuItems = Array.isArray(data) ? data : [];
          this.logger.debug('Menu loaded', { itemCount: this.menuItems.length });
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error('Menu load failed', { error });
          this.toastr.error('Failed to load menu items');
        }
      });
  }

  private loadSubscriptions(): void {
    this.subscriptionService
      .list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.subscriptionsList = Array.isArray(data) ? data : [];
          this.logger.debug('Subscriptions loaded', { count: this.subscriptionsList.length });
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.logger.error('Subscriptions load failed', { error });
          this.toastr.error('Failed to load subscriptions');
        }
      });
  }

  private loadPaymentConfig(): void {
    this.configService
      .getPaymentConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.paymentConfig = config;
          if (config?.defaultPaymentMode === 'UPI') {
            this.paymentMode = PaymentMode.UPI;
          }
        },
        error: (error) => {
          this.logger.error('Payment config load failed', { error });
        }
      });
  }

  // ==================== ORDER PROCESSING ====================

  private processOrders(orders: Order[]): void {
    if (!Array.isArray(orders)) {
      orders = [];
    }

    const today = new Date().toISOString().split('T')[0];

    // Today's orders
    this.todayOrders = orders.filter((o) =>
      (o.createdAt?.toString() || '').startsWith(today)
    );

    // Online orders (pending payment verification)
    this.onlineOrders = orders.filter((o) => {
      const status = o.status || OrderStatus.PENDING;
      const paymentStatus = o.paymentStatus || PaymentStatus.PENDING;
      return (
        paymentStatus === PaymentStatus.VERIFICATION_PENDING ||
        (o.paymentMode === PaymentMode.CASH && status === OrderStatus.PENDING)
      );
    });

    // Ongoing orders
    this.ongoingOrders = orders.filter((o) => {
      const status = o.status || OrderStatus.PENDING;
      const paymentStatus = o.paymentStatus || PaymentStatus.PENDING;
      const isVerificationPending =
        paymentStatus === PaymentStatus.VERIFICATION_PENDING ||
        (o.paymentMode === PaymentMode.CASH && status === OrderStatus.PENDING);

      return (
        !isVerificationPending &&
        status !== OrderStatus.CANCELLED &&
        status !== OrderStatus.COMPLETED &&
        status !== OrderStatus.DELIVERED &&
        status !== OrderStatus.PAID
      );
    });

    // Unpaid orders (served but payment pending)
    this.unpaidOrders = orders.filter((o) => {
      const status = o.status || OrderStatus.PENDING;
      const paymentStatus = o.paymentStatus || PaymentStatus.PENDING;
      return (
        status === OrderStatus.DELIVERED &&
        paymentStatus !== PaymentStatus.PAID &&
        paymentStatus !== PaymentStatus.COMPLETED
      );
    });

    this.prepareRevenueChart();
    this.logger.debug('Orders processed', {
      today: this.todayOrders.length,
      ongoing: this.ongoingOrders.length,
      unpaid: this.unpaidOrders.length
    });
    this.cdr.markForCheck();
  }

  printBill(order: Order): void {
    if (!order?.id) return;
    // Open invoice in new window for printing
    const url = `/invoice/${order.id}`;
    const width = 400; // Thermal width approx
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);

    window.open(url, '_blank', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
  }

  // ==================== CART MANAGEMENT ====================

  get cartItems(): FoodItem[] {
    return (this.orderForm.value.items || []) as FoodItem[];
  }

  get filteredMenu(): FoodItem[] {
    const term = (this.searchTerm || '').toLowerCase().trim();
    if (!term) return this.menuItems;

    return this.menuItems.filter((item) =>
      (item.name || '').toLowerCase().includes(term) ||
      (item.category || '').toLowerCase().includes(term)
    );
  }

  addItem(item: FoodItem): void {
    // Stock management mode
    if (this.isManageMode) {
      this.toggleItemAvailability(item);
      return;
    }

    // Add to cart
    if (!item?.id) {
      this.toastr.error('Invalid item');
      return;
    }

    const current = this.orderForm.value.items || [];
    this.orderForm.patchValue({ items: [...current, item] });
    this.toastr.success(`✓ ${item.name} added`, '', {
      timeOut: 1200,
      positionClass: 'toast-bottom-center'
    });
  }

  removeItemFromOrder(index: number): void {
    const items = [...(this.orderForm.value.items || [])];
    items.splice(index, 1);
    this.orderForm.patchValue({ items });
  }

  clearCart(): void {
    this.orderForm.reset({
      customerName: 'Walk-in Guest',
      customerPhone: '',
      address: 'Restaurant',
      orderType: 'DINE_IN',
      tableNumber: '',
      items: []
    });
    this.message = '🗑️ Cart cleared';
    setTimeout(() => (this.message = ''), 1500);
  }

  // ==================== CART CALCULATIONS ====================

  getCartSubtotal(items?: FoodItem[] | null): number {
    const list = items || this.cartItems;
    if (!list || !list.length) return 0;
    return list.reduce((sum, item) => sum + (item.price || 0), 0);
  }

  getCartTax(items?: FoodItem[] | null): { totalTax: number, cgst: number, sgst: number } {
    const list = items || this.cartItems;
    if (!list || !list.length) return { totalTax: 0, cgst: 0, sgst: 0 };

    let totalTax = 0;

    list.forEach(item => {
      const price = item.price || 0;
      const rate = item.gstRate ?? 5.0; // Use Nullish Coalescing: Allow 0 logic
      // Tax = Price * (Rate / 100)
      const tax = price * (rate / 100);
      totalTax += tax;
    });

    return {
      totalTax: totalTax,
      cgst: totalTax / 2,
      sgst: totalTax / 2
    };
  }

  getCartGrandTotal(items?: FoodItem[] | null): number {
    const subtotal = this.getCartSubtotal(items);
    const tax = this.getCartTax(items).totalTax;
    return subtotal + tax; // Delivery Fee not yet added here
  }

  getOrderCalculatedSubtotal(items: OrderItem[]): number {
    if (!items || !items.length) return 0;
    return items.reduce((acc, i) => acc + ((i.price || 0) * (i.qty || 1)), 0);
  }

  // Deprecated shim
  getTotal(items?: FoodItem[] | null): number {
    return this.getCartGrandTotal(items);
  }

  toggleCart(): void {
    this.showCartModal = !this.showCartModal;
  }

  // ==================== ORDER PLACEMENT ====================

  placeOrder(): void {
    if (this.isLoading) return; // Prevent double submission

    const items = this.orderForm.value.items || [];

    // Validation
    const validation = this.validateOrder();
    if (!validation.isValid) {
      validation.errors.forEach((error) => this.toastr.error(error));
      return;
    }

    const type = this.orderForm.value.orderType || 'DINE_IN';
    const tableNumStr = this.orderForm.value.tableNumber;
    const tableNum =
      tableNumStr === null || tableNumStr === undefined || tableNumStr === ''
        ? 0
        : Number(tableNumStr);

    // Check for table conflicts
    if (tableNum > 0) {
      this.checkTableConflicts(tableNum, items);
    } else {
      this.executeCreateNewOrder(tableNum, items);
    }
  }

  // Changed to public if used in template, otherwise safe.
  public toggleItemAvailability(item: FoodItem): void {
    if (!item?.id) return;

    const newStatus = !item.isAvailable;
    this.menuService
      .updateAvailability(item.id, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const idx = this.menuItems.findIndex((m) => m.id === updated.id);
          if (idx !== -1) {
            this.menuItems[idx] = updated;
          }
          this.toastr.success(
            `${updated.name} is now ${updated.isAvailable ? 'In Stock' : 'Out of Stock'}`
          );
        },
        error: (error) => {
          this.logger.error('Failed to update stock', { error, itemId: item.id });
          this.toastr.error('Failed to update stock status');
        }
      });
  }

  private validateOrder(): ValidationResult {
    const errors: string[] = [];
    const form = this.orderForm.value;

    // Customer name
    if (!form.customerName?.trim()) {
      errors.push('Customer name is required');
    }

    // Phone validation (only if provided)
    if (form.customerPhone && !this.isValidPhone(form.customerPhone)) {
      errors.push('Invalid phone number (must be 10 digits)');
    }

    // Items
    if (!form.items || form.items.length === 0) {
      errors.push('Order must have at least one item');
    } else if (form.items.length > POS_CONFIG.MAX_ITEMS_PER_ORDER) {
      errors.push(`Maximum ${POS_CONFIG.MAX_ITEMS_PER_ORDER} items allowed per order`);
    }

    // Table number for DINE_IN
    if (form.orderType === 'DINE_IN' && !form.tableNumber) {
      errors.push('Table number is required for dine-in orders');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidPhone(phone: string): boolean {
    return POS_CONFIG.PHONE_REGEX.test(phone);
  }

  private checkTableConflicts(tableNum: number, items: FoodItem[]): void {
    const ongoing = this.ongoingOrders.filter((o) => Number(o.tableNumber) === tableNum);
    const unpaid = this.unpaidOrders.filter((o) => Number(o.tableNumber) === tableNum);

    const map = new Map<number, Order>();
    ongoing.forEach((o) => { if (o.id) map.set(o.id, o); });
    unpaid.forEach((o) => { if (o.id) map.set(o.id, o); });

    const activeOrders = Array.from(map.values());

    if (activeOrders.length > 0) {
      this.conflictOrders = activeOrders;
      this.showConflictModal = true;
      this.showCartModal = false;
      this.pendingNewItems = items.map((i) => ({
        menuItemId: i.id!,
        name: i.name,
        qty: 1,
        price: i.price || 0
      }));
      this.logger.info('Table conflict detected', { tableNum, conflictCount: activeOrders.length });
    } else {
      this.executeCreateNewOrder(tableNum, items);
    }
  }

  confirmNewBill(): void {
    const tableNum = Number(this.orderForm.value.tableNumber);
    this.executeCreateNewOrder(tableNum, this.orderForm.value.items || []);
    this.closeConflictModal();
  }

  confirmAppend(existingOrder: Order): void {
    this.executeAppendOrder(existingOrder);
    this.closeConflictModal();
  }

  closeConflictModal(): void {
    this.showConflictModal = false;
    this.conflictOrders = [];
    this.showCartModal = true;
  }

  private executeCreateNewOrder(tableNum: number, items: FoodItem[]): void {
    if (this.isLoading) return;

    this.isLoading = true;

    const payload: any = {
      customerName: this.orderForm.value.customerName || 'Walk-in Guest',
      customerPhone: this.orderForm.value.customerPhone || '0000000000',
      address: this.orderForm.value.address || 'Restaurant',
      deliveryPincode: this.orderForm.value.pincode || '',
      orderType: this.orderForm.value.orderType || 'DINE_IN',
      tableNumber: tableNum.toString(),
      items: items.map((i) => ({
        menuItemId: i.id!,
        name: i.name,
        qty: 1,
        price: i.price || 0,
        status: 'PREPARING'
      })),
      total: items.reduce((sum, i) => sum + (i.price || 0), 0),
      status: OrderStatus.CONFIRMED,
      createdAt: new Date().toISOString()
    };

    this.orderService
      .createOrder(payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)),
        catchError((error) => {
          const message = this.errorHandler.getErrorMessage(error);
          this.logger.error('Order creation failed', { error, payload });
          this.toastr.error(message);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.finishOrderPlacement('✅ Order placed successfully');
        }
      });
  }

  private executeAppendOrder(existingOrder: Order): void {
    if (this.isLoading || !existingOrder.id) return;

    this.isLoading = true;

    // pendingNewItems are NOT OrderItem[], they are local objects.
    // Need to cast or map carefully.
    const combinedItems: OrderItem[] = existingOrder.items ? [...existingOrder.items] : [];
    this.pendingNewItems.forEach((newItem) => {
      const existingIdx = combinedItems.findIndex(
        (ex: any) =>
          ex.menuItemId === newItem.menuItemId &&
          (ex.status || 'PREPARING') === 'PREPARING'
      );

      if (existingIdx >= 0) {
        combinedItems[existingIdx].qty =
          (combinedItems[existingIdx].qty || 1) + 1;
      } else {
        combinedItems.push({
          menuItemId: Number(newItem.menuItemId),
          name: newItem.name,
          qty: 1,
          price: newItem.price! || 0,
          status: 'PREPARING'
        });
      }
    });

    const newTotal = combinedItems.reduce(
      (sum, item) => sum + ((item.qty || 1) * (item.price || 0)),
      0
    );

    const finalPayload = {
      items: combinedItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        qty: item.qty || 1,
        price: item.price || 0,
        status: item.status || 'PREPARING'
      })),
      totalAmount: newTotal,
      updatedBy: this.auth.currentUser()?.name || 'Staff',
      updatedAt: new Date().toISOString()
    };

    this.orderService
      .updateOrder(existingOrder.id, finalPayload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)),
        catchError((error) => {
          this.logger.error('Append order failed', { error, orderId: existingOrder.id });
          this.toastr.error('Failed to append items to order');
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.finishOrderPlacement(`✅ Items added to Order #${existingOrder.id}`);
        }
      });
  }

  private finishOrderPlacement(message: string): void {
    this.message = message;
    this.isLoading = false;

    this.orderForm.reset({
      customerName: 'Walk-in Guest',
      customerPhone: '0000000000',
      address: 'Restaurant',
      orderType: 'DINE_IN',
      tableNumber: '',
      items: []
    });

    this.showCartModal = false;
    this.loadOngoingOrders();
    this.loadTodayOrders();
    this.cdr.markForCheck(); // Force UI update
  }

  // ==================== ONGOING ORDERS ====================

  openEdit(order: Order): void {
    if (!order) return;

    this.editOrder = JSON.parse(JSON.stringify(order));
    this.editOrder!.items = (this.editOrder!.items || []).map((item) => ({
      ...item,
      // Ensure fields exist
      name: item.name,
      price: item.price,
      qty: item.qty || 1
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

    const idx = (this.editOrder.items || []).findIndex(
      (x: any) => x.menuItemId === item.id
    );

    if (idx >= 0) {
      this.editOrder!.items[idx].qty =
        (this.editOrder!.items[idx].qty || 0) + 1;
    } else {
      (this.editOrder!.items ||= []).push({
        menuItemId: item.id!,
        name: item.name,
        qty: 1,
        price: item.price!
      });
    }
  }

  removeItemFromEdit(idx: number): void {
    if (!this.editOrder?.items) return;
    this.editOrder.items.splice(idx, 1);
  }

  increaseQty(item: OrderItem): void {
    if (item) item.qty = (item.qty || 0) + 1;
  }

  decreaseQty(item: OrderItem): void {
    if (item) item.qty = Math.max(1, (item.qty || 1) - 1);
  }

  saveEdit(): void {
    if (!this.editOrder?.id) return;

    const normalizedItems = (this.editOrder!.items || []).map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      qty: item.qty || 1,
      price: item.price || 0,
      status: item.status || 'PREPARING'
    }));

    const payload = {
      items: normalizedItems,
      totalAmount: normalizedItems.reduce((sum, it) => sum + ((it.qty || 1) * (it.price || 0)), 0),
      updatedBy: this.auth.currentUser()?.name || 'Staff',
      updatedAt: new Date().toISOString()
    };

    this.orderService
      .updateOrder(this.editOrder.id, payload)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.logger.error('Update order failed', { error, orderId: this.editOrder?.id });
          this.toastr.error('Failed to update order');
          return of(null);
        })
      )
      .subscribe(() => {
        this.message = '✅ Order updated';
        this.showEditModal = false;
        this.editOrder = null;
        this.loadOngoingOrders();
        this.loadTodayOrders();
      });
  }

  // ==================== PAYMENT & BILLING ====================

  markOrderServed(order: Order): void {
    if (!order.id) return;
    const isDelivery = order.status === OrderStatus.OUT_FOR_DELIVERY;

    // Determine target status (Both effectively map to DELIVERED in backend as 'Served')
    // But confirmation message differs
    const verb = isDelivery ? 'Deliver' : 'Serve';

    if (!confirm(`Mark Order #${order.id} as ${verb}ed?`)) return;

    this.isLoading = true;
    this.orderService.updateOrderStatus(order.id, 'DELIVERED')
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: () => {
          this.toastr.success(`Order marked as ${verb}ed`);
          this.loadOngoingOrders();
          this.loadTodayOrders();
        },
        error: (err) => {
          this.logger.error('Failed to update status', err);
          this.toastr.error('Failed to update status');
        }
      });
  }

  verifyPayment(order: Order): void {
    if (!order.id || !confirm(`Verify payment for Order #${order.id}?`)) return;

    this.isLoading = true;
    this.orderService
      .verifyPayment(order.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.isLoading = false)),
        catchError((error) => {
          this.logger.error('Payment verification failed', { error, orderId: order.id });
          this.toastr.error('Payment verification failed');
          return of(null);
        })
      )
      .subscribe(() => {
        this.toastr.success('✅ Payment Verified! Order moved to Ongoing.');
        this.loadOngoingOrders();
      });
  }

  openPayment(order: any): void {
    this.payOrder = order;
    this.paymentMode = PaymentMode.CASH;
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
      this.subscriptionService.create(this.pendingTiffinPayload).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.message = `✅ Subscription Active! Paid via ${this.paymentMode}`;
          this.isLoading = false;
          this.pendingTiffinPayload = null;
          this.closePayment();
          this.loadSubscriptions();
        },
        error: (err: any) => {
          this.logger.error('Subscription creation failed', { error: err });
          this.message = '❌ Failed to create subscription';
          this.isLoading = false;
        }
      });
      return;
    }

    // 2. Handle Regular Order Payment
    if (!this.payOrder || !this.payOrder.id) return;

    this.isLoading = true;
    this.orderService.payOrder(this.payOrder.id, this.paymentMode, this.payOrder.totalAmount || this.payOrder.total || 0).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.message = `💰 Payment Confirmed (${this.paymentMode})`;
        this.closePayment();
        this.loadOngoingOrders();
        this.loadTodayOrders();
        this.isLoading = false;
      },
      error: (err: any) => {
        this.logger.error('Payment failed', { error: err });
        this.message = '❌ Payment failed';
        this.isLoading = false;
      }
    });
  }

  shareBill(order: Order): void {
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
      .map((i: any) => `${i.qty || i.quantity || 1}x ${i.name || i.itemName} (₹${i.price || i.pricePerUnit})`)
      .join('\n');

    const message =
      `🧾 *Bill for Order #${order.id}*\n` +
      `--------------------------------\n` +
      `Hello ${order.customerName || 'Guest'},\n` +
      `Here is your order summary:\n\n` +
      `${itemsList}\n` +
      `--------------------------------\n` +
      `*Total: ₹${order.total || order.totalAmount}*\n` +
      `--------------------------------\n` +
      `Thank you for dining with us! 🍽️`;

    if (mode === 'WHATSAPP') {
      this.notificationService.shareViaWhatsApp(phone, message);
    } else {
      this.notificationService.shareViaSMS(phone, message);
    }

    this.message = `🚀 Opening ${mode}...`;
    this.closeBillModal();
    this.logger.info('Bill shared', { orderId: order.id, mode });
  }

  // ==================== REVENUE & ANALYTICS ====================

  private prepareRevenueChart(): void {
    const days: Record<string, number> = {};

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      days[key] = 0;
    }

    (this.todayOrders || []).forEach((order) => {
      const key = (order.createdAt?.toString() || '').split('T')[0];
      if (key in days) {
        days[key] += Number(order.total || order.totalAmount || 0);
      }
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
    return (this.todayOrders || []).reduce(
      (sum, order) => sum + (Number(order.total || order.totalAmount) || 0),
      0
    );
  }

  getCashOrdersCount(): number {
    return (this.todayOrders || []).filter((o) => o.paymentMode === PaymentMode.CASH).length;
  }

  getOnlineOrdersCount(): number {
    return (this.todayOrders || []).filter((o) => o.paymentMode !== PaymentMode.CASH).length;
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  createSubscription(payload: TiffinModel): void {
    if (!payload) return;
    this.pendingTiffinPayload = payload;
    this.openPayment({
      id: 'NEW-SUB',
      customerName: payload.customerName,
      total: payload.finalAmount
    });
    this.message = '💰 Proceeding to Payment...';
  }

  toggleSubscriptionStatus(sub: TiffinModel): void {
    if (!sub.id) return;

    if (sub.status === 'ACTIVE') {
      this.pauseSubscription(sub);
    } else if (sub.status === 'PAUSED' && sub.pausedAt) {
      this.resumeSubscription(sub);
    }
  }

  private pauseSubscription(sub: TiffinModel): void {
    const payload = {
      ...sub,
      status: 'PAUSED',
      pausedAt: new Date().toISOString(),
      endDate: sub.endDate,
      totalPausedDays: sub.totalPausedDays
    };

    this.subscriptionService
      .updateStatus(sub.id!, payload)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.logger.error('Pause subscription failed', { error, subId: sub.id });
          this.toastr.error('Failed to pause subscription');
          this.loadSubscriptions();
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          this.message = '⏸ Subscription Paused';
          this.loadSubscriptions();
        },
        error: (err) => {
          // If already paused or state mismatch, just reload
          if (err.status === 500 || err.error?.message?.includes('ACTIVE')) {
            this.toastr.info('Syncing status...', '', { timeOut: 1000 });
          } else {
            this.toastr.error('Failed to pause');
          }
          this.loadSubscriptions();
        }
      });
  }

  private resumeSubscription(sub: TiffinModel): void {
    const pausedDate = new Date(sub.pausedAt!);
    const now = new Date();
    const diffDays = Math.ceil(
      Math.abs(now.getTime() - pausedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const newTotalPaused = (sub.totalPausedDays || 0) + diffDays;

    const currentEnd = new Date(sub.endDate);
    currentEnd.setDate(currentEnd.getDate() + diffDays);

    const maxEnd = new Date(sub.maxEndDate || currentEnd);
    const finalEnd = currentEnd > maxEnd ? maxEnd : currentEnd;

    const payload = {
      ...sub,
      status: 'ACTIVE',
      pausedAt: null,
      totalPausedDays: newTotalPaused,
      endDate: finalEnd.toISOString().split('T')[0]
    };

    this.subscriptionService
      .updateStatus(sub.id!, payload)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.logger.error('Resume subscription failed', { error, subId: sub.id });
          this.toastr.error('Failed to resume subscription');
          this.loadSubscriptions();
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          this.message = `✅ Resumed! Extended by ${diffDays} days.`;
          this.loadSubscriptions();
        },
        error: (err) => {
          console.error('Resume error', err);
          // Self-heal: If backend says "Can only resume PAUSED" (meaning it's ACTIVE), just reload
          if (err.status === 500 || err.error?.message?.includes('PAUSED')) {
            this.toastr.info('Subscription is already updated. Syncing...', '', { timeOut: 1500 });
          } else {
            this.toastr.error('Failed to resume subscription');
          }
          this.loadSubscriptions();
        }
      });
  }

  // ==================== LEAVE MANAGEMENT ====================

  getLeaveDuration(startDate: any, endDate: any): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1; // Include start date
  }

  loadMyLeaves(): void {
    this.leaveService.getMyLeaves().pipe(takeUntil(this.destroy$)).subscribe({
      next: (leaves: LeaveResponse[]) => {
        this.myLeaves = leaves;
        this.cdr.markForCheck();
      },
      error: () => this.toastr.error('Failed to load leave history')
    });
  }

  applyForLeave(): void {
    if (this.leaveForm.invalid) return;

    this.isLoading = true;
    const val = this.leaveForm.value;

    const payload = {
      startDate: val.startDate!,
      endDate: val.endDate!,
      reason: val.reason!
    };

    this.leaveService.apply(payload).subscribe({
      next: () => {
        this.toastr.success('Leave application submitted');
        this.showLeaveModal = false;
        this.loadMyLeaves();
        this.leaveForm.reset();
        this.isLoading = false;
      },
      error: (err: any) => {
        this.toastr.error(err.error?.message || 'Failed to apply for leave');
        this.isLoading = false;
      }
    });
  }

  // ==================== HELPERS ====================

  get subscriptionsCount(): number {
    return (this.subscriptionsList || []).filter((s) => s.status === 'ACTIVE').length;
  }

  loadOngoingOrders(): void {
    this.orderService.refreshOrders().pipe(takeUntil(this.destroy$)).subscribe();
  }

  loadTodayOrders(): void {
    this.orderService.refreshOrders().pipe(takeUntil(this.destroy$)).subscribe();
  }
}
