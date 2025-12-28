
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TenantService {
    private readonly STORAGE_KEY = 'rms_tenant_id';

    // Default to a demo restaurant ID if none set
    private tenantIdSubject = new BehaviorSubject<string | null>(this.loadTenantId());
    public tenantId$ = this.tenantIdSubject.asObservable();

    constructor() {
        this.identifyTenantFromUrl();
        if (!this.getTenantId()) {
            this.setTenantId('Maa-Ashtabhuja'); // Default for development
        }
    }

    /**
     * identifying tenant from subdomain (e.g. Maa-Ashtabhuja.app.com)
     * For now, we'll just mock it or load from storage
     */
    private identifyTenantFromUrl(): void {
        // Placeholder logic for subdomain parsing
        // const host = window.location.hostname;
        // const subdomain = host.split('.')[0];
        // if (subdomain && subdomain !== 'www') {
        //   this.setTenantId(subdomain);
        // }
    }

    getTenantId(): string | null {
        return this.tenantIdSubject.value;
    }

    setTenantId(id: string): void {
        localStorage.setItem(this.STORAGE_KEY, id);
        this.tenantIdSubject.next(id);
    }

    private loadTenantId(): string | null {
        return localStorage.getItem(this.STORAGE_KEY);
    }
}
