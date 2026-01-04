// src/app/core/guards/guest.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (user) {
    // If logged in, redirect based on role immediately
    let target = '/home';

    switch (user.role) {
      case 'SUPER_ADMIN':
        target = '/super-admin';
        break;
      case 'ADMIN':
        target = '/admin/dashboard';
        break;
      case 'STAFF':
        target = '/staff/pos?tab=order';
        break;
      default:
        target = '/customer/dashboard';
        break;
    }

    router.navigateByUrl(target);
    return false;
  }

  return true; // guest allowed
};
