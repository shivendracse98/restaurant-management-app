
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private injector: Injector) { }

    handleError(error: any): void {
        // Log the error to console for debugging
        console.error('🔥 Global Error Caught:', error);

        // NOTE: We do NOT show toasts here anymore for HTTP errors,
        // because the 'core.interceptor.ts' handles them with better context.
        // This handler is now a fallback for pure Runtime/Client-side JS errors.
    }
}
