
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { TenantService } from '../services/tenant.service';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export const coreInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const tenantService = inject(TenantService);
    const toastr = inject(ToastrService);

    // Get tokens and IDs
    const token = authService.getToken();
    const tenantId = tenantService.getTenantId();

    // Clone request to add headers
    let clonedReq = req.clone({
        setHeaders: {
            // Only add Auth header if token exists
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Always add Tenant ID if it exists
            ...(tenantId ? { 'X-Tenant-ID': tenantId } : {})
        }
    });

    return next(clonedReq).pipe(
        catchError((error) => {
            // Handle 401 Unauthorized globally
            if (error.status === 401) {
                toastr.error('Session expired. Please login again.');
                authService.logout();
            }

            // Pass the error along to specific handlers
            return throwError(() => error);
        })
    );
};
