import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { AdminService, DashboardStats } from '../../../core/services/admin.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStats | null = null;

  newStaff = {
    name: '',
    email: '',
    password: '',
    phoneNumber: ''
  };
  showStaffModal = false;

  viewMode: 'SINGLE' | 'GROUP' = 'SINGLE';
  canViewConsolidated = false;

  private destroy$ = new Subject<void>();

  constructor(
    public auth: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private adminService: AdminService,
    private webSocketService: WebSocketService
  ) { }

  ngOnInit(): void {
    this.redirectIfCustomer();
    this.checkGroupAccess();
    this.loadStats();
    this.setupRealtimeStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }

  setupRealtimeStats(): void {
    const user = this.auth.currentUser();
    if (user && user.restaurantId) {
      this.webSocketService.connect();

      this.webSocketService.subscribe('/topic/restaurant/' + user.restaurantId)
        .pipe(takeUntil(this.destroy$))
        .subscribe((payload: any) => {
          if (payload && payload.status === 'CONFIRMED' && this.stats) {
            // Only count confirmed orders as "Sales" (or verified payments)
            // Increment Order Count
            this.stats.todayOrders = (this.stats.todayOrders || 0) + 1;

            // Add to Revenue
            const amt = Number(payload.totalAmount || payload.total || 0);
            this.stats.todayRevenue = (this.stats.todayRevenue || 0) + amt;

            // Optionally flash a toast
            this.toastr.success(`💰 New Sale: ₹${amt}`, 'Live Update');
          }
        });
    }
  }

  checkGroupAccess(): void {
    const user = this.auth.currentUser();
    // Allow Consolidated view if user has > 1 restaurant available AND is not on STARTER plan
    const hasMultiple = !!(user?.availableRestaurants && user.availableRestaurants.length > 1);
    const isPlanEligible = user?.packageType !== 'STARTER';

    this.canViewConsolidated = hasMultiple && isPlanEligible;
  }

  toggleView(mode: 'SINGLE' | 'GROUP'): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.loadStats();
  }

  loadStats(): void {
    if (this.viewMode === 'GROUP') {
      const user = this.auth.currentUser();
      // Determine Group ID from the first available restaurant
      const groupId = user?.availableRestaurants?.[0]?.groupId;

      if (groupId) {
        this.adminService.getGroupStats(groupId).subscribe({
          next: (data) => this.stats = data,
          error: (err) => {
            console.error('Failed to load group stats', err);
            this.toastr.error('Could not load consolidated stats');
            this.viewMode = 'SINGLE'; // Fallback
          }
        });
      } else {
        this.toastr.warning('Group Context not found');
        this.viewMode = 'SINGLE';
      }
    } else {
      // SINGLE mode (original behavior)
      this.adminService.getDashboardStats().subscribe({
        next: (data) => {
          this.stats = data;
        },
        error: (err) => {
          console.error('Failed to load stats', err);
        }
      });
    }
  }

  redirectIfCustomer() {
    const user = this.auth.currentUser();
    if (user && user.role === 'CUSTOMER') {
      this.router.navigate(['/']);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  openManageStaff() {
    this.showStaffModal = true;
  }

  closeStaffModal() {
    this.showStaffModal = false;
    this.newStaff = { name: '', email: '', password: '', phoneNumber: '' };
  }

  registerStaff() {
    if (!this.newStaff.name || !this.newStaff.email || !this.newStaff.password) {
      this.toastr.error('Please fill all required fields', 'Error');
      return;
    }

    // Role passed as 'STAFF', autoLogin false
    this.auth.register(
      this.newStaff.name,
      this.newStaff.email,
      this.newStaff.password,
      this.newStaff.phoneNumber,
      'STAFF',
      false,
      this.auth.currentUser()?.restaurantId
    ).subscribe({
      next: () => {
        this.toastr.success('Staff member added successfully!', 'Success');
        this.closeStaffModal();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to add staff', 'Error');
      }
    });
  }
}
