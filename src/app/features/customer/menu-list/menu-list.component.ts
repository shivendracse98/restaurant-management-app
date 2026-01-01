import { FormsModule } from '@angular/forms';
import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuService } from '../../../core/services/menu.service';
import { FoodItem } from '../../../models/food-item.model';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { AppComponent } from 'src/app/app.component';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfigService } from '../../../core/services/config.service';

export type MenuViewMode = 'customer' | 'admin';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.scss']
})
export class MenuListComponent implements OnInit {
  @Input() viewMode: MenuViewMode = 'customer';

  foodItems: FoodItem[] = [];
  categories: string[] = [];
  groupedItems: { [key: string]: FoodItem[] } = {};
  filterType: 'ALL' | 'VEG' | 'NON_VEG' = 'ALL';
  currentTenantName = '';
  searchQuery = ''; // 🔍 New Search Query

  constructor(
    private menuService: MenuService,
    private cart: CartService,
    private app: AppComponent,
    private tenantService: TenantService,
    private route: ActivatedRoute,
    public authService: AuthService,
    private configService: ConfigService
  ) { }

  ngOnInit(): void {
    // 1. Check for QR Code Context (restaurantId, tableId)
    this.route.queryParams.subscribe(params => {
      const rid = params['restaurantId'];
      const tid = params['tableId'];

      if (rid) {
        console.log('🌍 Setting Tenant from QR:', rid);
        this.tenantService.setTenantId(rid);
      }

      if (tid) {
        console.log('🍽️ Setting Table from QR:', tid);
        sessionStorage.setItem('rms_table_id', tid);
      }
    });

    // 2. Load Menu based on current tenant
    this.tenantService.tenantId$.subscribe(tenantId => {
      this.loadMenu(tenantId || undefined);
      if (tenantId) {
        this.configService.getAllTenants().subscribe(tenants => {
          const t = tenants.find(x => x.tenantId === tenantId);
          this.currentTenantName = t ? t.name : '';
        });
      }
    });
  }

  loadMenu(tenantId?: string): void {
    this.menuService.getMenu(tenantId).subscribe({
      next: (data) => {
        console.log('✅ Menu Loaded:', data);
        this.foodItems = data;
        this.processCategories();
      },
      error: (err) => console.error('❌ Error loading menu:', err)
    });
  }

  // --- Filter & Grouping Logic ---

  get filteredFoodItems(): FoodItem[] {
    let items = this.foodItems;

    // 1. Filter by Type
    if (this.filterType === 'VEG') items = items.filter(item => item.isVeg !== false);
    if (this.filterType === 'NON_VEG') items = items.filter(item => item.isVeg === false);

    // 2. Filter by Search Query
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      items = items.filter(item =>
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }

    return items;
  }

  setFilter(type: 'ALL' | 'VEG' | 'NON_VEG'): void {
    this.filterType = type;
    this.processCategories(); // Re-group based on new filter
  }

  updateSearch(query: string): void {
    this.searchQuery = query;
    this.processCategories();
  }

  processCategories(): void {
    // 1. Get relevant items based on filter
    const itemsToGroup = this.filteredFoodItems;

    // 2. Identify unique Categories
    const unique = new Set(itemsToGroup.map(i => i.category || 'Other').filter(c => c));
    this.categories = Array.from(unique).sort();

    // 3. Group them
    this.groupedItems = {};
    this.categories.forEach(cat => {
      this.groupedItems[cat] = itemsToGroup.filter(i => (i.category || 'Other') === cat);
    });
  }

  scrollToCategory(category: string): void {
    const element = document.getElementById('cat-' + category);
    if (element) {
      const yOffset = -120; // Adjust based on header height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  // --- Cart & Actions ---

  addToCart(item: FoodItem): void {
    if (this.viewMode !== 'customer') return;

    // GUEST CART: No login check required here.
    this.cart.add(item);
    this.app.showToast(`${item.name} added to cart!`);
  }

  isAdminMode(): boolean {
    return this.viewMode === 'admin';
  }

  isCustomerMode(): boolean {
    return this.viewMode === 'customer';
  }

  editMenuItem(item: FoodItem): void {
    if (this.viewMode !== 'admin') return;
    console.log('Edit item:', item);
    // TODO: Implement edit dialog
  }

  deleteMenuItem(item: FoodItem): void {
    if (this.viewMode !== 'admin') return;
    if (confirm(`Delete ${item.name}?`)) {
      this.foodItems = this.foodItems.filter((i) => i.id !== item.id);
      this.processCategories(); // Refresh view
      this.app.showToast('Item deleted successfully');
    }
  }

  trackByItemId(_index: number, item: FoodItem): number {
    return item.id;
  }
}
