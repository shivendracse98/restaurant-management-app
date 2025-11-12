// src/app/core/guards/guest.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (user) {
    // If logged in, redirect by role
    const target = user.role === 'ADMIN' ? '/admin/dashboard' : '/menu';
    router.navigate([target]);
    return false;
  }

  return true; // guest allowed
};
