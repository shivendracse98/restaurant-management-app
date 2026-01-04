import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import checking
import { SuperAdminService } from '../services/super-admin.service';
import { TenantDetail } from '../models/tenant-detail.model';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  tenants: TenantDetail[] = [];
  loading = true;

  constructor(private superAdminService: SuperAdminService) { }

  ngOnInit(): void {
    this.loadTenants();
  }

  loadTenants(): void {
    this.loading = true;
    this.superAdminService.getAllTenants().subscribe({
      next: (data) => {
        this.tenants = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load tenants', err);
        this.loading = false;
      }
    });
  }

  extendSubscription(tenant: TenantDetail): void {
    if (confirm(`Extend subscription for ${tenant.restaurantName} by 1 month?`)) {
      this.superAdminService.extendSubscription(tenant.tenantId, 1).subscribe(() => {
        alert('Extended!');
        this.loadTenants();
      });
    }
  }

  toggleStatus(tenant: TenantDetail): void {
    if (tenant.status === 'SUSPENDED') {
      if (confirm(`Reactivate ${tenant.restaurantName}?`)) {
        this.superAdminService.reactivateTenant(tenant.tenantId).subscribe(() => this.loadTenants());
      }
    } else {
      if (confirm(`⚠️ SUSPEND ${tenant.restaurantName}? This will block access immediately.`)) {
        this.superAdminService.suspendTenant(tenant.tenantId).subscribe(() => this.loadTenants());
      }
    }
  }

  getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  // Feature Management
  readonly availableFeatures = ['DELIVERY_MANAGEMENT'];

  toggleFeature(tenant: TenantDetail, feature: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const action = isChecked ? 'Enable' : 'Disable';

    if (confirm(`${action} ${feature} for ${tenant.restaurantName}?`)) {
      if (isChecked) {
        this.superAdminService.enableFeature(tenant.tenantId, feature).subscribe({
          next: () => alert('Feature Enabled!'),
          error: () => {
            alert('Failed to enable feature');
            (event.target as HTMLInputElement).checked = !isChecked; // Revert
          }
        });
      } else {
        this.superAdminService.disableFeature(tenant.tenantId, feature).subscribe({
          next: () => alert('Feature Disabled!'),
          error: () => {
            alert('Failed to disable feature');
            (event.target as HTMLInputElement).checked = !isChecked; // Revert
          }
        });
      }
    } else {
      (event.target as HTMLInputElement).checked = !isChecked; // Cancelled
    }
  }
}
