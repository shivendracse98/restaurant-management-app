
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset Password</h2>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">New Password</label>
              <div class="mt-1">
                <input id="password" type="password" formControlName="password" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>
            </div>

            <div class="mt-4">
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div class="mt-1">
                <input id="confirmPassword" type="password" formControlName="confirmPassword" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>
              <div *ngIf="form.errors?.['mismatch'] && form.get('confirmPassword')?.touched" class="text-red-500 text-xs mt-1">
                Passwords do not match.
              </div>
            </div>

            <div class="mt-6">
              <button type="submit" [disabled]="form.invalid || isLoading" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {{ isLoading ? 'Resetting...' : 'Reset Password' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
    form = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    isLoading = false;
    token = '';

    constructor(
        private fb: FormBuilder,
        private auth: AuthService,
        private router: Router,
        private route: ActivatedRoute,
        private toastr: ToastrService
    ) { }

    ngOnInit() {
        this.token = this.route.snapshot.queryParams['token'];
        if (!this.token) {
            this.toastr.error('Invalid or missing token');
            this.router.navigate(['/login']);
        }
    }

    passwordMatchValidator(g: any) {
        return g.get('password').value === g.get('confirmPassword').value
            ? null : { 'mismatch': true };
    }

    submit() {
        if (this.form.invalid) return;
        this.isLoading = true;

        this.auth.resetPassword(this.token, this.form.value.password!).subscribe({
            next: () => {
                this.toastr.success('Password reset successful. Please login.');
                this.router.navigate(['/login']);
            },
            error: (err) => {
                this.toastr.error('Failed to reset password.');
                this.isLoading = false;
            }
        });
    }
}
