import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { OrderService } from '../../../core/services/order.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { MenuService } from '../../../core/services/menu.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ConfigService, PaymentConfig } from '../../../core/services/config.service';
import { FoodItem } from '../../../models/food-item.model';
import { Subscription as TiffinModel } from '../../../models/subscription.model';

import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-staff-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgChartsModule],
  templateUrl: './staff-pos.component.html',
  styleUrls: ['./staff-pos.component.scss']
})
export class StaffPosComponent implements OnInit, OnDestroy {
  // Tabs
  activeTab: 'ORDER' | 'TIFFIN' | 'ONGOING' | 'REVENUE' = 'ORDER';

  // Data
  menuItems: FoodItem[] = [];
  subscriptionsList: TiffinModel[] = [];
  todayOrders: any[] = [];
  ongoingOrders: any[] = [];
  paymentConfig: PaymentConfig | null = null;
  paymentMode: string = 'CASH';
  pendingTiffinPayload: TiffinModel | null = null;

  // UI state
  message = '';
  isLoading = false;
  showEditModal = false;
  editOrder: any = null;

  // search
  searchTerm = '';

  // forms
  orderForm = this.fb.group({
    customerName: ['Walk-in Guest', Validators.required],
    customerPhone: ['0000000000'],
    address: ['Restaurant'],
    orderType: ['DINE_IN', Validators.required],
    tableNumber: [''],
    items: [[] as FoodItem[]]
  });

  tiffinForm = this.fb.group({
    customerName: ['', Validators.required],
    customerPhone: ['', Validators.required],
    frequency: ['DAILY', Validators.required],
    durationMonths: [1, Validators.required],
    type: ['LUNCH', Validators.required],
    address: ['', Validators.required],
    pricePerMeal: [100, [Validators.required, Validators.min(1)]],
    menuItemId: [null, Validators.required]
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
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadMenu();
    this.loadSubscriptions();
    this.loadTodayOrders();
    this.loadOngoingOrders();

    // query param driven tab selection
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((qp: any) => {
      if (qp['tab'] === 'orders') this.activeTab = 'REVENUE';
      else if (qp['tab'] === 'tiffin') this.activeTab = 'TIFFIN';
      else if (qp['tab'] === 'ongoing') this.activeTab = 'ONGOING';
      else this.activeTab = 'ORDER';
    });

    // Load Payment Config
    this.configService.getPaymentConfig().subscribe(config => {
      if (config) {
        this.paymentConfig = config;
        if (config.defaultMode === 'UPI') {
          this.paymentMode = 'UPI';
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== LOADS ==========

  loadMenu(): void {
    this.menuService.getAllMenuItems().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        this.menuItems = data || [];
        this.filterTiffinMenu(); // Separate Tiffin items
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

  loadTodayOrders(): void {
    const today = new Date().toISOString().split('T')[0];
    this.orderService.getOrders().pipe(takeUntil(this.destroy$)).subscribe({
      next: (all: any) => {
        const arr = Array.isArray(all) ? all : [];
        this.todayOrders = arr.filter((o: any) => (o.createdAt || '').startsWith(today));
        this.prepareRevenueChart();
      },
      error: (err: any) => {
        console.error('Failed to load today orders', err);
        this.todayOrders = [];
      }
    });
  }

  loadOngoingOrders(): void {
    this.orderService.getOrders().pipe(takeUntil(this.destroy$)).subscribe({
      next: (all: any) => {
        const arr = Array.isArray(all) ? all : [];
        this.ongoingOrders = arr.filter((o: any) => {
          const status = o.status || 'PENDING';
          // Filter out CANCELLED and COMPLETED/PAID (if exists), but keep DELIVERED (Served)
          return status !== 'CANCELLED' && status !== 'COMPLETED' && status !== 'PAID';
        });
      },
      error: (err: any) => {
        console.error('Failed to load ongoing orders', err);
        this.ongoingOrders = [];
      }
    });
  }

  // ========== GETTERS ==========

  get cartItems(): FoodItem[] {
    return (this.orderForm.value.items as FoodItem[]) || [];
  }

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

  // ========== POS ACTIONS ==========

  addItem(item: FoodItem): void {
    const current = this.orderForm.value.items || [];
    this.orderForm.patchValue({ items: [...current, item] });
    this.message = `✓ ${item.name} added`;
    setTimeout(() => (this.message = ''), 1500);
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
      items: []
    });
    this.message = '🗑️ Cart cleared';
    setTimeout(() => (this.message = ''), 1500);
  }

  placeOrder(): void {
    const items = this.orderForm.value.items || [];
    if (!items.length) {
      this.message = '⚠️ Please add at least one item';
      return;
    }

    const mapped = items.map((i: FoodItem) => ({
      // If 'i' has 'id' (from menu selection), use that as menuItemId.
      id: i.id, // IMPORTANT: cart item must have 'id' so OrderService can map it to 'menuItemId'
      menuItemId: i.id, // Also keeping this for safety if logic changes
      qty: 1,
      price: i.price,
      name: i.name
    }));

    const payload: any = {
      customerName: this.orderForm.value.customerName || 'Walk-in Guest',
      customerPhone: this.orderForm.value.customerPhone || '0000000000',
      address: this.orderForm.value.address || 'Restaurant',
      orderType: this.orderForm.value.orderType || 'DINE_IN',
      tableNumber: this.orderForm.value.tableNumber || '', // Added tableNumber
      items: mapped,
      total: mapped.reduce((s: number, m: any) => s + (m.price || 0) * (m.qty || 1), 0),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.isLoading = true;

    this.orderService.createOrder(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.message = '✅ Order placed successfully';
        this.isLoading = false;
        this.orderForm.reset({
          customerName: 'Walk-in Guest',
          customerPhone: '0000000000',
          address: 'Restaurant',
          orderType: 'DINE_IN',
          items: []
        });
        this.loadOngoingOrders();
        this.loadTodayOrders();
      },
      error: (err: any) => {
        console.error('Place order error', err);
        this.message = '❌ Failed to place order';
        this.isLoading = false;
      }
    });
  }

  // ========== TIFFIN MANAGEMENT ==========

  tiffinMenuItems: FoodItem[] = [];

  // Recalculate Tiffin list when menu loads
  private filterTiffinMenu(): void {
    this.tiffinMenuItems = this.menuItems.filter(m => (m.category || '').toUpperCase() === 'TIFFIN');
  }

  // Dynamic Price Calculation
  get tiffinCalculation(): any {
    const months = this.tiffinForm.value.durationMonths || 1;
    const menuId = this.tiffinForm.value.menuItemId;
    const selected = this.menuItems.find(m => m.id == Number(menuId));

    if (!selected) return null;

    const dailyPrice = selected.price || 0;
    const standardDays = 30 * months;
    const billedDays = 28 * months; // 2 Days Free per month

    const standardTotal = dailyPrice * standardDays;
    const finalPrice = dailyPrice * billedDays;
    const saved = standardTotal - finalPrice;

    return {
      dailyPrice,
      months,
      billedDays,
      finalPrice,
      saved
    };
  }

  createTiffin(): void {
    if (this.tiffinForm.invalid) {
      this.message = '⚠️ Please complete tiffin details';
      return;
    }

    const calc = this.tiffinCalculation;
    if (!calc) {
      this.message = '⚠️ Invalid Menu Selection';
      return;
    }

    const today = new Date();
    const startDate = today.toISOString().split('T')[0];

    // Logic: 30 days per month
    const totalDays = 30 * calc.months;
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + totalDays);

    // Max Extension: 5 days per month
    const maxDays = totalDays + (5 * calc.months);
    const maxEndDateObj = new Date(today);
    maxEndDateObj.setDate(today.getDate() + maxDays);

    const payload: TiffinModel = {
      customerName: this.tiffinForm.value.customerName || '',
      customerPhone: this.tiffinForm.value.customerPhone || '',
      address: this.tiffinForm.value.address || '',

      startDate: startDate,
      endDate: endDateObj.toISOString().split('T')[0],
      maxEndDate: maxEndDateObj.toISOString().split('T')[0],

      frequency: 'DAILY',
      durationMonths: calc.months,
      menuItemId: Number(this.tiffinForm.value.menuItemId) || 0,
      menuItemName: this.menuItems.find(m => m.id == Number(this.tiffinForm.value.menuItemId))?.name || 'Tiffin',

      pricePerDay: calc.dailyPrice,
      billedDays: calc.billedDays,
      discountAmount: calc.saved,
      finalAmount: calc.finalPrice,

      status: 'ACTIVE',
      totalPausedDays: 0
    };

    this.pendingTiffinPayload = payload;

    // Open Payment Modal with mapped fields
    this.openPayment({
      id: 'NEW-SUB',
      customerName: payload.customerName,
      total: payload.finalAmount,
      // Metadata for display if needed
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
    this.editOrder.items = (this.editOrder.items || []).map((it: any) => ({ ...it, qty: it.qty || 1 }));
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

    const payload: any = {
      items: this.editOrder.items,
      total: (this.editOrder.items || []).reduce((s: number, it: any) => s + (it.price || 0) * (it.qty || 0), 0),
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

  shareBill(order: any): void {
    if (!order) return;

    // Fallback phone if missing
    const phone = order.customerPhone || '0000000000';

    // Construct simplified bill text
    const itemsList = (order.items || [])
      .map((i: any) => `${i.qty}x ${i.name} (₹${i.price})`)
      .join('\n');

    const message =
      `🧾 *Bill for Order #${order.id}*\n\n` +
      `Hello ${order.customerName || 'Guest'},\n\n` +
      `Here is your order summary:\n` +
      `${itemsList}\n\n` +
      `*Total: ₹${order.total}*\n\n` +
      `Thank you for dining with TasteTown! 🍽️`;

    this.notificationService.shareViaWhatsApp(phone, message);
    this.message = '🚀 Opening WhatsApp...';
    setTimeout(() => this.message = '', 2000);
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

  // ========== SWITCH TAB ==========

  switchTab(tab: 'ORDER' | 'TIFFIN' | 'ONGOING' | 'REVENUE'): void {
    this.activeTab = tab;
    this.message = '';
    if (tab === 'REVENUE') this.loadTodayOrders();
    if (tab === 'ONGOING') this.loadOngoingOrders();
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

          // Reset Form
          this.tiffinForm.reset({
            durationMonths: 1,
            frequency: 'DAILY',
            pricePerMeal: 100
          });
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
}
