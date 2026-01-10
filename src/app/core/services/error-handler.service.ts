import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ErrorHandlerService {

    getErrorMessage(error: any): string {
        if (error instanceof HttpErrorResponse) {
            // Backend returned an unsuccessful response code.
            // The response body may contain clues as to what went wrong.
            if (error.error instanceof ErrorEvent) {
                // A client-side or network error occurred.
                return `Network Error: ${error.error.message}`;
            } else {
                // The backend returned an unsuccessful response code.
                return error.error?.message || `Server Error (${error.status}): ${error.message}`;
            }
        } else if (error instanceof Error) {
            // A client-side or network error occurred.
            return error.message;
        } else {
            return 'An unknown error occurred';
        }
    }
}
