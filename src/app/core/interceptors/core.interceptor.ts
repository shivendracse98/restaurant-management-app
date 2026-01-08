
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

    if (req.url.includes('/menu')) {
        console.log(`📡 Interceptor: Sending Request to ${req.url} with TenantID: '${tenantId}'`);
    }

    return next(clonedReq).pipe(
        catchError((error) => {
            // Log for Developers (Always)
            console.error(`🚨 HTTP Error [${error.status}] at ${req.url}:`, error);

            // 1. Handle 401 Unauthorized (Session Expired)
            if (error.status === 401) {
                toastr.error('Session expired. Please login again.');
                authService.logout();
                return throwError(() => error);
            }

            // 2. Handle 403 Forbidden (Access Denied)
            if (error.status === 403) {
                // Suppress toast for specific background checks if needed (e.g. config)
                const isConfigCheck = req.url.includes('/config') || req.url.includes('/offers');

                if (!isConfigCheck) {
                    toastr.error('Access Denied. You do not have permission to perform this action.', 'Permission Error');
                }
                return throwError(() => error);
            }

            // 3. Handle 500 Internal Server Error
            if (error.status === 500) {
                toastr.error('Something went wrong on our end. Please try again later.', 'Server Error');
                return throwError(() => error);
            }

            // 4. Handle 0 (Network Error / Server Down)
            if (error.status === 0) {
                toastr.error('Server unreachable. Please check your internet connection.', 'Network Error');
                return throwError(() => error);
            }

            // 5. Default Handler (400, 404, etc.) - Extract meaningful message
            let message = 'An unexpected error occurred';
            if (error.error && typeof error.error === 'object') {
                if (error.error.message) {
                    message = error.error.message;
                } else if (error.error.error) {
                    message = error.error.error;
                }
            } else if (error.message) {
                if (!error.error) message = error.message;
            }

            toastr.error(message, `Error (${error.status})`);
            return throwError(() => error);
        })
    );
};
