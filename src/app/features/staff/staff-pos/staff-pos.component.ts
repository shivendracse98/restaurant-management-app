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
    private route: ActivatedRoute
  ) {}

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
          return status !== 'DELIVERED' && status !== 'CANCELLED';
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
      menuItemId: i.id,
      qty: 1,
      price: i.price,
      name: i.name
    }));

    const payload: any = {
      customerName: this.orderForm.value.customerName || 'Walk-in Guest',
      customerPhone: this.orderForm.value.customerPhone || '0000000000',
      address: this.orderForm.value.address || 'Restaurant',
      orderType: this.orderForm.value.orderType || 'DINE_IN',
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

  selectTiffinPlan(plan: 'plain' | 'deluxe' | 'special'): void {
    const key = plan === 'plain' ? 'plain' : plan === 'deluxe' ? 'deluxe' : 'special';
    const found = this.menuItems.find((m: FoodItem) => (m.name || '').toLowerCase().includes(key));
    if (found) {
      this.tiffinForm.patchValue({ menuItemId: found.id as any });
    } else if (this.menuItems.length) {
      this.tiffinForm.patchValue({ menuItemId: this.menuItems[0].id as any });
    }
    this.tiffinForm.patchValue({ frequency: 'DAILY', durationMonths: 1 });
  }

  createTiffin(): void {
    if (this.tiffinForm.invalid) {
      this.message = '⚠️ Please complete tiffin details';
      return;
    }

    const menuId = Number(this.tiffinForm.value.menuItemId);
    const selected = this.menuItems.find((m: FoodItem) => m.id === menuId);
    if (!selected) {
      this.message = '⚠️ Pick valid tiffin menu';
      return;
    }

    const payload: any = {
      customerName: this.tiffinForm.value.customerName,
      customerPhone: this.tiffinForm.value.customerPhone,
      startDate: new Date().toISOString().split('T')[0],
      frequency: this.tiffinForm.value.frequency,
      durationMonths: Number(this.tiffinForm.value.durationMonths),
      menuPlan: [
        { menuItemId: selected.id, name: selected.name, qty: 1, price: selected.price }
      ],
      totalPerDelivery: selected.price,
      status: 'ACTIVE',
      createdBy: this.auth.currentUser()?.name || 'Staff',
      createdAt: new Date().toISOString()
    };

    this.isLoading = true;

    this.subscriptionService.create(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.message = '✅ Tiffin created successfully';
        this.isLoading = false;
        this.tiffinForm.reset({ frequency: 'DAILY', durationMonths: 1 });
        this.loadSubscriptions();
      },
      error: (err: any) => {
        console.error('Tiffin create failed', err);
        this.message = '❌ Failed to create tiffin';
        this.isLoading = false;
      }
    });
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

  trackByItem(_index: number, item: FoodItem): number {
    return item.id;
  }
}
