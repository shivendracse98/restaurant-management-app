import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouteConfigLoadStart, RouteConfigLoadEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CartService } from './core/services/cart.service';
import { AuthService } from './core/services/auth.service';
import { NetworkService } from './core/services/network.service';
import { TenantService } from './core/services/tenant.service';
import { ConfigService } from './core/services/config.service';

import { FormsModule } from '@angular/forms';
import { MobileBottomNavComponent } from './shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MobileBottomNavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  toastVisible = false;
  toastMessage = '';
  cartCount = 0;
  isLandingPage = false;

  private sub?: Subscription;
  private routerSub?: Subscription;

  currentTenantName = '';
  isMobileMenuOpen = false;
  platformConfig = { platformName: 'TasteTown', supportEmail: '' }; // Default while loading

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  constructor(
    public cart: CartService,
    public auth: AuthService,
    private router: Router,
    private tenantService: TenantService,
    private configService: ConfigService,
    private networkService: NetworkService // Added NetworkService to constructor
  ) { }

  ngOnInit() {
    // Track tenant changes to update header
    this.tenantService.tenantId$.subscribe(id => {
      // Load Platform Config
      this.configService.getPlatformConfig().subscribe(config => {
        console.log('✅ Platform Config Loaded:', config);
        this.platformConfig = config;
      });
      if (id) {
        this.configService.getAllTenants().subscribe(tenants => {
          const t = tenants.find(x => x.tenantId === id);
          this.currentTenantName = t ? t.name : id;
        });
      }
    });

    // ✅ Sync Tenant from User if Logged In (Restores correct admin context on refresh)
    const currentUser = this.auth.currentUser();
    if (currentUser && currentUser.restaurantId) {
      const currentTenant = this.tenantService.getTenantId();
      // Only override if different or default
      if (currentTenant !== currentUser.restaurantId) {
        console.log('🔄 Restoring Tenant from Session:', currentUser.restaurantId);
        this.tenantService.setTenantId(currentUser.restaurantId);
      }
    }

    // Cart count listener
    this.sub = this.cart.items$.subscribe(items => {
      this.cartCount = items.reduce((s, it) => s + it.qty, 0);
    });

    // Router event logging & Navbar Logic
    this.routerSub = this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        // Toggle Global Navbar visibility
        // Hide on explicit Landing Page routes
        const hiddenRoutes = ['/', '/about'];
        // Also hide if URL starts with /# (anchor links on landing page)
        const isAnchor = evt.urlAfterRedirects.startsWith('/#') || evt.urlAfterRedirects.includes('#');

        this.isLandingPage = hiddenRoutes.includes(evt.urlAfterRedirects) ||
          (evt.urlAfterRedirects === '/' || evt.urlAfterRedirects === '/about') ||
          (this.isLandingPage && isAnchor); // Persist if anchor

        // Better logic: Just check if exact match '/' or '/about' (ignoring params/anchors for now)
        // Actually, Angular Router strips anchors often. using startWith might be safer for /
        if (evt.urlAfterRedirects === '/' || evt.urlAfterRedirects === '/about' || evt.urlAfterRedirects.startsWith('/?')) {
          this.isLandingPage = true;
        } else {
          this.isLandingPage = false;
        }

        console.log('[Router] End ->', evt.urlAfterRedirects, 'isLandingPage:', this.isLandingPage);
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.routerSub?.unsubscribe();
  }

  goHome(): void {
    const user = this.auth.currentUser();
    console.log('[goHome] user=', user);
    if (!user) {
      this.router.navigate(['/home']);
    } else if (user.role === 'ADMIN') {
      this.router.navigate(['/admin/dashboard']);
    } else if (user.role === 'STAFF') {
      this.router.navigate(['/staff/pos']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  logout(): void {
    console.log('[logout] triggered');
    this.auth.logout();
    this.cart.clear();
    // Use replaceUrl so browser back doesn’t re-login
    this.router.navigate(['/'], { replaceUrl: true });
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 2000);
  }

  get availableRestaurants() {
    return this.auth.currentUser()?.availableRestaurants || [];
  }

  isGroupAdmin() {
    return this.availableRestaurants.length > 0;
  }

  switchContext(targetId: string) {
    // Note: With ngModelChange, targetId is the value string directly
    console.log('👉 Context/Restaurant Switch Triggered. Target ID:', targetId);

    if (targetId) {
      if (this.auth.currentUser()?.restaurantId === targetId) {
        console.warn('⚠️ Target ID is same as Current ID. No action taken.');
        return;
      }
      this.auth.switchRestaurant(targetId);
    } else {
      console.error('❌ Context Switch Failed: No Value selected.');
    }
  }
}
