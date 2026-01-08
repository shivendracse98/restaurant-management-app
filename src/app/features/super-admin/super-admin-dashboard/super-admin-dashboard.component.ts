import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import checking
import { MatDialog } from '@angular/material/dialog';
import { SuperAdminService } from '../services/super-admin.service';
import { TenantDetail } from '../models/tenant-detail.model';
import { UpgradePlanDialogComponent } from '../components/upgrade-plan-dialog/upgrade-plan-dialog.component';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.scss']
})
export class SuperAdminDashboardComponent implements OnInit {
  tenants: TenantDetail[] = [];
  globalStats: any = null;
  loading = true;

  constructor(
    private superAdminService: SuperAdminService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadTenants();
    this.loadGlobalStats();
  }

  loadGlobalStats(): void {
    this.superAdminService.getGlobalAnalytics().subscribe({
      next: (data) => this.globalStats = data,
      error: (err) => console.error('Failed to load global stats', err)
    });
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

  // Dashboard Logic
  searchTerm = '';
  filterStatus = 'ALL'; // ALL, ACTIVE, PENDING, SUSPENDED, EXPIRED

  // Pagination
  currentPage = 1;
  pageSize = 5;

  get filteredTenants(): TenantDetail[] {
    let result = this.tenants;

    // 1. Filter by Status
    if (this.filterStatus !== 'ALL') {
      result = result.filter(t => t.status === this.filterStatus);
    }

    // 2. Filter by Search
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(t =>
        t.restaurantName.toLowerCase().includes(term) ||
        t.ownerEmail.toLowerCase().includes(term) ||
        t.tenantId.toLowerCase().includes(term)
      );
    }

    return result;
  }

  get paginatedTenants(): TenantDetail[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTenants.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTenants.length / this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((x, i) => i + 1);
  }

  // Stats
  get totalTenantsCount(): number { return this.tenants.length; }
  get activeTenantsCount(): number { return this.tenants.filter(t => t.status === 'ACTIVE').length; }
  get pendingTenantsCount(): number {
    return this.tenants.filter(t => t.status === 'TRIAL' || t.status === 'SUSPENDED').length;
  }
  // Mock Revenue Calculation
  get estimatedRevenue(): number {
    return this.tenants.reduce((acc, t) => {
      if (t.planType === 'MONTHLY') return acc + 29; // Mock $29/mo
      if (t.planType === 'YEARLY') return acc + 290; // Mock $290/yr
      if (t.planType === 'LIFETIME') return acc + 999;
      return acc;
    }, 0);
  }

  // Helpers
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getDaysRemaining(endDate: string): number {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  }

  // Actions
  extendSubscription(tenant: TenantDetail): void {
    if (confirm(`Extend subscription for ${tenant.restaurantName} by 1 month?`)) {
      this.superAdminService.extendSubscription(tenant.tenantId, 1).subscribe(() => {
        // alert('Extended!'); // Replace with toast if available
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

  // Feature Management
  readonly availableFeatures = ['DELIVERY_MANAGEMENT'];

  toggleFeature(tenant: TenantDetail, feature: string, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;

    // Optimistic update
    if (!tenant.features) tenant.features = {};
    tenant.features[feature] = isChecked;

    if (isChecked) {
      this.superAdminService.enableFeature(tenant.tenantId, feature).subscribe({
        error: () => {
          if (tenant.features) tenant.features[feature] = !isChecked; // Revert
          alert('Failed to enable feature');
        }
      });
    } else {
      this.superAdminService.disableFeature(tenant.tenantId, feature).subscribe({
        error: () => {
          if (tenant.features) tenant.features[feature] = !isChecked; // Revert
          alert('Failed to disable feature');
        }
      });
    }
  }

  /* Group Management Dialog */
  showGroupDialog = false;
  selectedTenantForGroup: TenantDetail | null = null;

  openGroupDialog(tenant: TenantDetail): void {
    this.selectedTenantForGroup = tenant;
    this.showGroupDialog = true;
  }

  closeGroupDialog(): void {
    this.showGroupDialog = false;
    this.selectedTenantForGroup = null;
  }

  onGroupAssigned(): void {
    alert('Restaurant successfully added to the group!');
    this.loadTenants(); // Refresh data
  }

  openUpgradeDialog(tenant: TenantDetail): void {
    if (!tenant.groupId) {
      alert('This restaurant is not associated with a group and needs migration before upgrading plan.');
      return;
    }

    const dialogRef = this.dialog.open(UpgradePlanDialogComponent, {
      width: '500px',
      data: {
        groupId: tenant.groupId,
        currentPlanId: tenant.planId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTenants();
      }
    });
  }
}
