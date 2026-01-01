import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      // Check if user has exact SUPER_ADMIN role
      if (user && user.role === 'SUPER_ADMIN') {
        return true;
      }

      console.warn('Access Denied: Not a Super Admin');
      return router.createUrlTree(['/login']);
    })
  );
};
