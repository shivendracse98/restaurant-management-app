import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule], // ✅ Add RouterModule here
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  showPassword = false; // 👁️ For toggle visibility
  returnUrl = '/home';
  errorMsg = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService
  ) { }

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
  }

  submit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: (user) => {
        if (user) {
          console.log('✅ Login successful');
          if (user.role === 'ADMIN') {
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
