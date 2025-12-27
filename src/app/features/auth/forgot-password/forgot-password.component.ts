
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Forgot your password?</h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
              <div class="mt-1">
                <input id="email" type="email" formControlName="email" class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
              </div>
              <div *ngIf="form.get('email')?.touched && form.get('email')?.invalid" class="text-red-500 text-xs mt-1">
                Please enter a valid email.
              </div>
            </div>

            <div class="mt-6">
              <button type="submit" [disabled]="form.invalid || isLoading" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
              </button>
            </div>
            
            <div class="mt-4 text-center">
              <a routerLink="/login" class="font-medium text-indigo-600 hover:text-indigo-500">Back to Login</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]]
    });
    isLoading = false;

    constructor(
        private fb: FormBuilder,
        private auth: AuthService,
        private toastr: ToastrService
    ) { }

    submit() {
        if (this.form.invalid) return;
        this.isLoading = true;

        this.auth.forgotPassword(this.form.value.email!).subscribe({
            next: () => {
                this.toastr.success('Reset link sent to your email.');
                this.isLoading = false;
            },
            error: (err) => {
                this.toastr.error('Failed to send reset link.');
                this.isLoading = false;
            }
        });
    }
}
