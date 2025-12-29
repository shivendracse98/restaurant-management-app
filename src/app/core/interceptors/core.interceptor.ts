
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
            // 1. Handle 401 Unauthorized globally
            if (error.status === 401) {
                toastr.error('Session expired. Please login again.');
                authService.logout();
                return throwError(() => error); // Stop further processing
            }

            // 2. Handle 0 / Network Error
            if (error.status === 0) {
                toastr.error('Server unreachable. Please check your internet connection.', 'Network Error');
                return throwError(() => error);
            }

            // 3. Extract Meaningful Message
            let message = 'An unexpected error occurred';

            // Backend Custom Error JSON: { "message": "Order not found", ... }
            if (error.error && typeof error.error === 'object') {
                if (error.error.message) {
                    message = error.error.message;
                } else if (error.error.error) { // sometimes nested
                    message = error.error.error;
                }
            } else if (error.message) {
                // Flashback only if no backend body (client-side error)
                // NOTE: HttpErrorResponse.message is usually generic "Http failure..." so we prefer backend body
                if (!error.error) message = error.message;
            }

            // 4. Show Toast Immediately
            toastr.error(message, `Error (${error.status})`);

            // Pass error along, but we've handled the UI notification
            return throwError(() => error);
        })
    );
};
