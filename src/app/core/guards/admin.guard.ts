// src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.role === 'SUPER_ADMIN') {
    // Allow Super Admin to peek if needed, or redirect to super-admin
    router.navigate(['/super-admin']);
    return false;
  }

  if (user.role !== 'ADMIN') {
    // Redirect to their specific dashboard instead of generic home
    if (user.role === 'STAFF') router.navigate(['/staff/pos']);
    else if (user.role === 'CUSTOMER') router.navigate(['/customer/dashboard']);
    else router.navigate(['/home']);
    return false;
  }
  return true;
};
