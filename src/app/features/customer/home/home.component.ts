import { Component, OnInit, signal, computed, HostListener, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';

import { ConfigService } from '../../../core/services/config.service';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/services/auth.service';
import { RestaurantCardComponent } from '../../../components/restaurant-card/restaurant-card.component';
import { CartService } from '../../../core/services/cart.service';

interface Restaurant {
  id: number;
  tenantId: string; // Added tenantId for real navigation
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: number;
  deliveryFee: number;
  image: string;
  promoted?: boolean;
  discount?: number;
  offerText?: string;
  distance?: string;
}

interface Category {
  name: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RestaurantCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {

  // ===== SIGNALS (Reactive State) =====
  searchQuery = signal<string>('');
  activeCategory = signal<string>('All');
  loading = signal<boolean>(true); // Start loading true
  sortBy = 'recommended';
  isScrolled = false;
  showSearchSuggestions = false;

  // UI Signals
  cartCount = signal<number>(0);
  userLocation = signal<string>('Bhopal, India');

  // Data Signals
  restaurants = signal<Restaurant[]>([]);
  categories: Category[] = [
    { name: 'All', icon: '🍽️' },
    { name: 'Pure Veg', icon: '🥗' }, // Current tenant data usually has this
    { name: 'South Indian', icon: '🥘' },
    { name: 'Fast Food', icon: '🍔' },
    { name: 'Desserts', icon: '🍰' },
    { name: 'Beverages', icon: '☕' },
    { name: 'Bakery', icon: '🥐' },
    { name: 'Chinese', icon: '🥢' }
  ];

  // Stats
  restaurantCount = 0; // Dynamic
  deliveryTime = '30-45 min';

  // Computed Signals
  filteredRestaurants = computed(() => {
    let filtered = this.restaurants();

    // Filter by category
    if (this.activeCategory() !== 'All') {
      const cat = this.activeCategory().toLowerCase();
      filtered = filtered.filter(r =>
        (r.cuisine || '').toLowerCase().includes(cat) ||
        (cat === 'pure veg' && (r.name.toLowerCase().includes('shree') || r.name.toLowerCase().includes('maa'))) // Mock logic for demo
      );
    }

    // Filter by search
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(query) ||
        (r.cuisine || '').toLowerCase().includes(query)
      );
    }

    // Apply sorting
    return this.applySortingLogic(filtered);
  });

  private destroy$ = new Subject<void>();
  private searchDebounce$ = new Subject<string>();

  constructor(
    private router: Router,
    private configService: ConfigService,
    private tenantService: TenantService,
    private auth: AuthService,
    private cartService: CartService
  ) {
    // Setup search debouncing
    this.searchDebounce$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchQuery.set(query);
      });
  }

  ngOnInit(): void {
    // 🛡️ Guard: Admin/Staff should not see this page
    const user = this.auth.currentUser();
    if (user && user.role !== 'CUSTOMER') {
      if (user.role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
      else if (user.role === 'STAFF') this.router.navigate(['/staff/pos']);
      else if (user.role === 'SUPER_ADMIN') this.router.navigate(['/super-admin']);
      return;
    }

    this.loadRestaurants();
    this.initializeCart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== LOAD DATA =====
  private loadRestaurants(): void {
    this.loading.set(true);

    this.configService.getAllTenants().subscribe({
      next: (tenants: any[]) => {
        // MAPPING REAL DATA TO NEW UI INTERFACE
        const mappedRestaurants: Restaurant[] = tenants.map((t, index) => ({
          id: t.id,
          tenantId: t.tenantId, // IMPORTANT: Keep for navigation
          name: t.name,
          cuisine: t.cuisine || (index % 2 === 0 ? 'North Indian' : 'Fast Food'), // Fallback
          rating: 4.0 + (index % 10) / 10, // Mock Rating 4.0 - 4.9
          deliveryTime: 30 + (index * 5) % 30, // Mock Time
          deliveryFee: index % 3 === 0 ? 0 : 40, // Mock Fee
          image: t.imageUrl || `assets/images/restaurant-${(index % 5) + 1}.jpg`, // Fallback logic needed?
          promoted: index < 2, // Promote first 2
          discount: index % 4 === 0 ? 20 : undefined,
          offerText: index % 4 === 0 ? '20% OFF' : undefined,
          distance: `${(1 + index * 0.5).toFixed(1)} km`
        }));

        this.restaurants.set(mappedRestaurants);
        this.restaurantCount = mappedRestaurants.length;
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load tenants', err);
        this.loading.set(false);
      }
    });
  }

  // ===== FILTERING & SORTING =====
  filterByCategory(category: string): void {
    this.activeCategory.set(category);
  }

  applySorting(): void {
    // Sorting is handled by computed signal trigger
    this.restaurants.update(current => [...current]); // Trigger re-computation if needed? 
    // Actually computed signals auto-track dependencies. `this.sortBy` is not a signal, so we might need to force update 
    // or make sortBy a signal. For now, simple re-assignment works.
  }

  private applySortingLogic(restaurants: Restaurant[]): Restaurant[] {
    const sorted = [...restaurants];

    switch (this.sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'delivery-time':
        return sorted.sort((a, b) => a.deliveryTime - b.deliveryTime);
      case 'discount':
        return sorted.sort((a, b) => (b.discount || 0) - (a.discount || 0));
      case 'nearest':
        return sorted.sort((a, b) => parseFloat(a.distance || '0') - parseFloat(b.distance || '0'));
      case 'recommended':
      default:
        // Put promoted restaurants first
        return sorted.sort((a, b) => {
          if (a.promoted && !b.promoted) return -1;
          if (!a.promoted && b.promoted) return 1;
          return b.rating - a.rating;
        });
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.activeCategory.set('All');
  }

  // ===== SEARCH SUGGESTIONS =====
  getSearchSuggestions(): string[] {
    const query = this.searchQuery().toLowerCase();
    const allCuisines = ['Veg', 'Non-Veg', 'Fast Food', 'Biryani', 'Café', 'Bakery', 'Chinese'];
    const allRestaurants = this.restaurants().map(r => r.name);

    return [
      ...allCuisines.filter(c => c.toLowerCase().includes(query)),
      ...allRestaurants.filter(r => r.toLowerCase().includes(query))
    ].slice(0, 5);
  }

  // ===== NAVIGATION =====
  onRestaurantSelect(restaurant: Restaurant): void {
    // ✅ PRESERVE EXISTING NAVIGATION LOGIC
    this.tenantService.setTenantId(restaurant.tenantId);
    this.router.navigate(['/menu']);
  }

  navigateToProfile(): void {
    // Adapted to existing dashboard
    this.router.navigate(['/customer/dashboard']);
  }

  navigateToCart(): void {
    this.router.navigate(['/cart']);
  }

  applyPromoCode(code: string): void {
    // Just simple reload for now
    this.searchQuery.set('');
  }

  isPromotedRestaurant(id: number): boolean {
    return this.restaurants().find(r => r.id === id)?.promoted || false;
  }

  openLocationModal(): void {
    // Placeholder
    console.log('Open location modal');
  }

  // ===== SCROLL DETECTION =====
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  private initializeCart(): void {
    this.cartService.items$.pipe(takeUntil(this.destroy$)).subscribe((items: any[]) => {
      const count = items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      this.cartCount.set(count);
    });
  }
}
