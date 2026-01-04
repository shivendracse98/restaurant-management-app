import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FeatureFlagConfig {
    [key: string]: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class FeatureFlagService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/api/feature-flags`;
    // Note: Backend endpoint may need adjustment based on final controller implementation.
    // Assuming a simplistic endpoint that returns a map of { "FEATURE_NAME": true/false }

    constructor() { }

    /**
     * Fetch all flags for the current tenant.
     * Backend should automatically determine tenant from JWT/Context.
     */
    getFlags(): Observable<FeatureFlagConfig> {
        return this.http.get<FeatureFlagConfig>(this.apiUrl).pipe(
            catchError(err => {
                console.warn('Failed to fetch feature flags, using defaults', err);
                return of({}); // Return empty or defaults on error
            })
        );
    }
}
