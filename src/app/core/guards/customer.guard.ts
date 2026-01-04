// src/app/core/guards/customer.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.role !== 'CUSTOMER') {
    if (user.role === 'ADMIN') router.navigate(['/admin/dashboard']);
    else if (user.role === 'STAFF') router.navigate(['/staff/pos']);
    else if (user.role === 'SUPER_ADMIN') router.navigate(['/super-admin']);
    else router.navigate(['/home']);
    return false;
  }
  return true;
};
