import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const financeGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.currentUser$.pipe(
        take(1),
        map(user => {
            // Check if user has FINANCE_TEAM role
            // OR SUPER_ADMIN (optional, but usually super admins can access everything)
            if (user && (user.role === 'FINANCE_TEAM' || user.role === 'SUPER_ADMIN')) {
                return true;
            }

            console.warn('Access Denied: Not Finance Team');
            return router.createUrlTree(['/login']);
        })
    );
};
