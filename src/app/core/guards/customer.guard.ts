// src/app/core/guards/customer.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (!user || user.role !== 'CUSTOMER') {
    router.navigate(['/home']);
    return false;
  }
  return true;
};
