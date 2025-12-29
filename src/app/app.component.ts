import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouteConfigLoadStart, RouteConfigLoadEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { CartService } from './core/services/cart.service';
import { AuthService } from './core/services/auth.service';
import { NetworkService } from './core/services/network.service';
import { TenantService } from './core/services/tenant.service';
import { ConfigService } from './core/services/config.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  toastVisible = false;
  toastMessage = '';
  cartCount = 0;
  private sub?: Subscription;
  private routerSub?: Subscription;

  currentTenantName = '';

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
      if (id) {
        this.configService.getAllTenants().subscribe(tenants => {
          const t = tenants.find(x => x.tenantId === id);
          this.currentTenantName = t ? t.name : id;
        });
      }
    });

    // Cart count listener
    this.sub = this.cart.items$.subscribe(items => {
      this.cartCount = items.reduce((s, it) => s + it.qty, 0);
    });

    // Router event logging
    this.routerSub = this.router.events.subscribe(evt => {
      if (evt instanceof NavigationStart) {
        console.log('[Router] Start ->', evt.url);
      } else if (evt instanceof RouteConfigLoadStart) {
        console.log('[Router] Lazy load start ->', evt.route.path);
      } else if (evt instanceof RouteConfigLoadEnd) {
        console.log('[Router] Lazy load end ->', evt.route.path);
      } else if (evt instanceof NavigationEnd) {
        console.log('[Router] End ->', evt.urlAfterRedirects);
      } else if (evt instanceof NavigationCancel) {
        console.warn('[Router] Cancelled ->', evt.url);
      } else if (evt instanceof NavigationError) {
        console.error('[Router] Error ->', evt.error);
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
    this.router.navigate(['/home'], { replaceUrl: true });
  }

  showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), 2000);
  }
}
