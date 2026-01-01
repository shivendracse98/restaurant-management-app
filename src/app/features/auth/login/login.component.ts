import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  showPassword = false;
  returnUrl = '/home';
  errorMsg = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService,
    private tenantService: TenantService
  ) { }

  loginTitle = 'Login'; // Default title

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    const reason = this.route.snapshot.queryParams['reason'];

    if (reason === 'checkout') {
      this.loginTitle = 'Login to Complete Order';
    }

    // ✅ Fix: If already logged in, redirect away from login page
    if (this.auth.isLoggedIn()) {
      const user = this.auth.currentUser();

      // Sync Tenant ID if available
      if (user?.restaurantId) {
        this.tenantService.setTenantId(user.restaurantId);
      }

      // ✅ Prioritize returnUrl if present (e.g. back to checkout)
      if (this.route.snapshot.queryParams['returnUrl']) {
        this.router.navigateByUrl(this.route.snapshot.queryParams['returnUrl']);
        return;
      }

      if (user?.role === 'SUPER_ADMIN') this.router.navigateByUrl('/super-admin');
      else if (user?.role === 'ADMIN') this.router.navigateByUrl('/admin/dashboard');
      else if (user?.role === 'STAFF') this.router.navigate(['/staff/pos'], { queryParams: { tab: 'order' } });
      else this.router.navigateByUrl('/home');
    }
  }

  submit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: (user) => {
        if (user) {
          console.log('✅ Login successful');

          // ✅ Sync Tenant Context from User Profile
          if (user.restaurantId) {
            this.tenantService.setTenantId(user.restaurantId);
          }

          // ✅ Redirect to returnUrl (e.g. checkout) if present
          if (this.returnUrl && this.returnUrl !== '/home') {
            this.router.navigateByUrl(this.returnUrl);
            return;
          }

          if (user.role === 'SUPER_ADMIN') {
            this.router.navigateByUrl('/super-admin');
          } else if (user.role === 'ADMIN') {
            this.router.navigateByUrl('/admin/dashboard');
          }
          else if (user.role === 'STAFF') {
            this.router.navigate(['/staff/pos'], { queryParams: { tab: 'order' } });
          }
          else {
            // Redirect customers to dashboard by default
            this.router.navigateByUrl('/customer/dashboard');
          }
        } else {
          this.errorMsg = 'Invalid email or password';
        }
      },
      error: (err) => {
        console.error('Login failed', err);
        this.errorMsg = err.message || 'Login failed. Please try again.';
      }
    });
  }

  /** 👁️ Toggle Password Visibility */
  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
