import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Services & models (your paths may vary slightly)
import { OrderService } from '../../../core/services/order.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { MenuService } from '../../../core/services/menu.service';
import { AuthService } from '../../../core/services/auth.service';
import { FoodItem } from '../../../models/food-item.model';
import { Subscription as TiffinModel } from '../../../models/subscription.model';

// Charts
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
    menuItemId: [null, Validators.required]
  });

  // chart data (ng2-charts)
  revenueChartLabels: string[] = [];
  revenueChartData: any[] = [{ data: [], label: 'Revenue (₹)' }];
  revenueChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Last 7 Days Revenue',
        font: { size: 14 }
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
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadMenu();
    this.loadSubscriptions();
    this.loadTodayOrders();
    this.loadOngoingOrders();

    // query param driven tab selection
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(qp => {
      if (qp['tab'] === 'orders') this.activeTab = 'REVENUE';
      else if (qp['tab'] === 'tiffin') this.activeTab = 'TIFFIN';
      else if (qp['tab'] === 'ongoing') this.activeTab = 'ONGOING';
      else this.activeTab = 'ORDER';
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== loads ==========
  // loadMenu() {
  //   this.menuService.getMenu().subscribe({
  //     next: items => (this.menuItems = items || []),
  //     error: err => console.error('Menu load failed', err)
  //   });
  // }
  loadMenu(): void {
  this.menuService.getAllMenuItems().subscribe({
    next: (data) => {
      this.menuItems = data || [];
    },
    error: (err) => console.error('Menu load error', err)
  });
}


  loadSubscriptions() {
    this.subscriptionService.list().subscribe({
      next: data => (this.subscriptionsList = data || []),
      error: err => console.error('Subscriptions load failed', err)
    });
  }

  loadTodayOrders() {
    const today = new Date().toISOString().split('T')[0];
    this.orderService.getOrders().subscribe({
      next: (all) => {
        const arr = Array.isArray(all) ? all : [];
        this.todayOrders = arr.filter(o => (o.createdAt || '').startsWith(today));
        this.prepareRevenueChart();
      },
      error: err => {
        console.error('Failed to load today orders', err);
        this.todayOrders = [];
      }
    });
  }

  loadOngoingOrders() {
    this.orderService.getOrders().subscribe({
      next: (all) => {
        const arr = Array.isArray(all) ? all : [];
        this.ongoingOrders = arr.filter(o => o.status && o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
      },
      error: err => {
        console.error('Failed to load ongoing orders', err);
        this.ongoingOrders = [];
      }
    });
  }

  // ========== helper getters ==========
  get cartItems(): FoodItem[] {
    return (this.orderForm.value.items as FoodItem[]) || [];
  }

  get filteredMenu(): FoodItem[] {
    const term = (this.searchTerm || '').toLowerCase().trim();
    if (!term) return this.menuItems;
    return this.menuItems.filter(m =>
      (m.name || '').toLowerCase().includes(term) ||
      (m.category || '').toLowerCase().includes(term)
    );
  }

  get subscriptionsCount(): number {
    return (this.subscriptionsList || []).filter(s => s.status === 'ACTIVE').length;
  }

  // ========== POS actions ==========
  addItem(item: FoodItem) {
    const current = this.orderForm.value.items || [];
    this.orderForm.patchValue({ items: [...current, item] });
    this.message = `${item.name} added`;
    setTimeout(() => (this.message = ''), 1500);
  }

  removeItemFromOrder(index: number) {
    const items = [...(this.orderForm.value.items || [])];
    items.splice(index, 1);
    this.orderForm.patchValue({ items });
  }

  getTotal(items?: FoodItem[] | null): number {
    if (!items || !items.length) return 0;
    return items.reduce((s, i) => s + (i.price || 0), 0);
  }

  placeOrder() {
    const items = this.orderForm.value.items || [];
    if (!items.length) {
      this.message = 'Please add at least one item.';
      return;
    }

    const mapped = items.map(i => ({
      menuItemId: i.id,
      qty: 1,
      price: i.price,
      name: i.name
    }));

    const payload = {
      customerName: this.orderForm.value.customerName || 'Walk-in Guest',
      customerPhone: this.orderForm.value.customerPhone || '0000000000',
      address: this.orderForm.value.address || 'Restaurant',
      orderType: this.orderForm.value.orderType || 'DINE_IN',
      items: mapped,
      total: mapped.reduce((s, m) => s + (m.price || 0) * (m.qty || 1), 0),
      status: 'PENDING' as const,
      createdAt: new Date().toISOString()
    };

    this.isLoading = true;
    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.message = '✅ Order placed';
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
      error: err => {
        console.error('Place order error', err);
        this.message = 'Failed to place order';
        this.isLoading = false;
      }
    });
  }

  // ========== TIFFIN ==========
  createTiffin() {
    if (this.tiffinForm.invalid) {
      this.message = 'Please complete tiffin details';
      return;
    }

    const menuId = Number(this.tiffinForm.value.menuItemId);
    const selected = this.menuItems.find(m => m.id === menuId);
    if (!selected) {
      this.message = 'Pick valid tiffin menu';
      return;
    }

    const payload = {
      customerName: this.tiffinForm.value.customerName!,
      customerPhone: this.tiffinForm.value.customerPhone!,
      startDate: new Date().toISOString().split('T')[0],
      frequency: this.tiffinForm.value.frequency as 'DAILY' | 'WEEKLY' | 'MONTHLY',
      durationMonths: Number(this.tiffinForm.value.durationMonths),
      menuPlan: [
        { menuItemId: selected.id, name: selected.name, qty: 1, price: selected.price }
      ],
      totalPerDelivery: selected.price,
      status: 'ACTIVE' as const,
      createdBy: this.auth.currentUser()?.name || 'Staff',
      createdAt: new Date().toISOString()
    };

    this.isLoading = true;
    this.subscriptionService.create(payload).subscribe({
      next: () => {
        this.message = 'Tiffin created';
        this.isLoading = false;
        this.tiffinForm.reset({ frequency: 'DAILY', durationMonths: 1 });
        this.loadSubscriptions();
      },
      error: err => {
        console.error('Tiffin create failed', err);
        this.message = 'Failed to create tiffin';
        this.isLoading = false;
      }
    });
  }

  // quick-select tiffin plans (called from template)
  selectTiffinPlan(plan: 'plain' | 'deluxe' | 'special') {
    const key = plan === 'plain' ? 'plain' : plan === 'deluxe' ? 'delux' : 'special';
    const found = this.menuItems.find(m => (m.name || '').toLowerCase().includes(key));

    if (found) {
      this.tiffinForm.patchValue({ menuItemId: found.id as any });
    } else if (this.menuItems.length) {
      this.tiffinForm.patchValue({ menuItemId: this.menuItems[0].id as any });
    }

    this.tiffinForm.patchValue({ frequency: 'DAILY', durationMonths: 1 });
  }


  // ========== ONGOING ORDERS (edit/mark paid) ==========
  openEdit(order: any) {
    // shallow clone + ensure qty for each item present
    this.editOrder = JSON.parse(JSON.stringify(order || {}));
    this.editOrder.items = (this.editOrder.items || []).map((it: any) => ({ ...it, qty: it.qty || 1 }));
    this.showEditModal = true;

    // scroll to modal after render (small timeout to let modal display)
    setTimeout(() => {
      const el = document.querySelector('.modal-backdrop');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  closeEdit() {
    this.showEditModal = false;
    this.editOrder = null;
  }

  addItemToEdit(item: FoodItem) {
    if (!this.editOrder) return;
    const idx = (this.editOrder.items || []).findIndex((x: any) => x.menuItemId === item.id);
    if (idx >= 0) {
      this.editOrder.items[idx].qty = (this.editOrder.items[idx].qty || 0) + 1;
    } else {
      (this.editOrder.items ||= []).push({ menuItemId: item.id, name: item.name, qty: 1, price: item.price });
    }
  }

  removeItemFromEdit(idx: number) {
    if (!this.editOrder) return;
    this.editOrder.items.splice(idx, 1);
  }

  increaseQty(i: any) { if (i) i.qty = (i.qty || 0) + 1; }
  decreaseQty(i: any) { if (i) i.qty = Math.max(1, (i.qty || 1) - 1); }

  saveEdit() {
    if (!this.editOrder || !this.editOrder.id) return;
    const payload: any = {
      items: this.editOrder.items,
      total: (this.editOrder.items || []).reduce((s: number, it: any) => s + (it.price || 0) * (it.qty || 0), 0),
      updatedBy: this.auth.currentUser()?.name || 'Staff',
      updatedAt: new Date().toISOString()
    };

    this.orderService.updateOrder(this.editOrder.id, payload).subscribe({
      next: () => {
        this.message = 'Order updated';
        this.showEditModal = false;
        this.editOrder = null;
        this.loadOngoingOrders();
        this.loadTodayOrders();
      },
      error: err => {
        console.error('Update order failed', err);
        this.message = 'Failed to update order';
      }
    });
  }

  markPaymentDone(order: any, method: 'CASH' | 'UPI' = 'CASH') {
    const payload: any = { paymentStatus: 'PAID', paymentMethod: method, paidAt: new Date().toISOString() };
    this.orderService.updateOrder(order.id, payload).subscribe({
      next: () => {
        this.message = 'Payment marked paid';
        this.loadOngoingOrders();
        this.loadTodayOrders();
      },
      error: err => {
        console.error('mark paid failed', err);
        this.message = 'Failed to mark payment';
      }
    });
  }

  updateOrderStatus(order: any, newStatus: string) {
    // cast sanity
    const status = (newStatus || 'PENDING') as any;
    this.orderService.updateOrder(order.id, { status }).subscribe({
      next: () => {
        this.loadOngoingOrders();
        this.loadTodayOrders();
      },
      error: err => console.error('Status update failed', err)
    });
  }

  // ========== CHART / REVENUE helpers ==========
  prepareRevenueChart() {
    // last 7 days
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }

    (this.todayOrders || []).forEach(o => {
      const key = (o.createdAt || '').split('T')[0];
      if (key in days) days[key] += Number(o.total || 0);
    });

    this.revenueChartLabels = Object.keys(days);
    this.revenueChartData = [{ data: Object.values(days), label: 'Revenue (₹)' }];
  }

  getTodayRevenueTotal(): number {
    return (this.todayOrders || []).reduce((s, o) => s + (Number(o.total) || 0), 0);
  }

  // switch tab
  switchTab(tab: 'ORDER' | 'TIFFIN' | 'ONGOING' | 'REVENUE') {
    this.activeTab = tab;
    this.message = '';
    if (tab === 'REVENUE') this.loadTodayOrders();
    if (tab === 'ONGOING') this.loadOngoingOrders();
  }
}
