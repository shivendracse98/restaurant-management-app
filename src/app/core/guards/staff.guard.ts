// src/app/core/guards/staff.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const staffGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (!user) {
    // not logged in → send to public home/login
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }

  if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
    // not staff (but allow ADMIN to access staff pages if you want)
    router.navigate(['/home'], { replaceUrl: true });
    return false;
  }

  return true;
};
