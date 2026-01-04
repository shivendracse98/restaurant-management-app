import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../../core/services/config.service';
import { TenantService } from '../../../core/services/tenant.service';
import { AuthService } from '../../../core/services/auth.service';
import { RestaurantCardComponent } from './components/restaurant-card/restaurant-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RestaurantCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  // ✅ Signals State Management
  restaurants = signal<any[]>([]); // Raw data
  searchQuery = signal<string>(''); // Search input

  loading = signal<boolean>(true);

  // ✅ Computed Filter Logic (The Engine)
  filteredRestaurants = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.restaurants();

    if (!query) return list;

    return list.filter(r =>
      r.name?.toLowerCase().includes(query) ||
      r.description?.toLowerCase().includes(query) ||
      r.cuisine?.toLowerCase().includes(query)
    );
  });

  // Mock Categories for V1
  categories = [
    { name: 'Pure Veg', icon: '🥗' },
    { name: 'Fast Food', icon: '🍔' },
    { name: 'Premium', icon: '👑' },
    { name: 'Pocket Friendly', icon: '💸' }
  ];

  constructor(
    private configService: ConfigService,
    private tenantService: TenantService,
    private router: Router,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
    // 🛡️ Guard: Admin/Staff should not see this page
    const user = this.auth.currentUser();
    if (user && user.role !== 'CUSTOMER') {
      if (user.role === 'ADMIN') this.router.navigate(['/admin/dashboard']);
      else if (user.role === 'STAFF') this.router.navigate(['/staff/pos']);
      else if (user.role === 'SUPER_ADMIN') this.router.navigate(['/super-admin']);
      return;
    }

    // Fetch Data & Update Signal
    this.configService.getAllTenants().subscribe({
      next: (data) => {
        this.restaurants.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Handle Card Click from Child Component
  onRestaurantSelect(tenantId: string): void {
    this.tenantService.setTenantId(tenantId);
    this.router.navigate(['/menu']);
  }

  // Quick Filter by Category (Mock Logic)
  filterByCategory(cat: string) {
    this.searchQuery.set(cat === 'Premium' ? '' : cat); // Simple toggle for now
  }
}
