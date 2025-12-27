
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    constructor(private injector: Injector) { }

    handleError(error: any): void {
        const toastr = this.injector.get(ToastrService);

        // Log the error to console for debugging
        console.error('🔥 Global Error Caught:', error);

        // Extract message
        let message = 'An unexpected error occurred';
        if (error.error && error.error.message) {
            message = error.error.message;
        } else if (error.message) {
            message = error.message;
        }

        // Show toast
        toastr.error(message, 'Error');

        // Optional: Send to logging service (Sentry, etc.)
    }
}
