import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { AdminService, DashboardStats } from '../../../core/services/admin.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;

  newStaff = {
    name: '',
    email: '',
    password: '',
    phoneNumber: ''
  };
  showStaffModal = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    private toastr: ToastrService,
    private adminService: AdminService
  ) { }

  ngOnInit(): void {
    this.redirectIfCustomer();
    this.loadStats();
  }

  loadStats(): void {
    this.adminService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (err) => {
        console.error('Failed to load stats', err);
      }
    });
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
