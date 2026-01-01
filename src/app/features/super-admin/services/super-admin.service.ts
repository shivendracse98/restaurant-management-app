import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TenantDetail } from '../models/tenant-detail.model';

@Injectable({
    providedIn: 'root'
})
export class SuperAdminService {
    private apiUrl = `${environment.apiBaseUrl}/super-admin`;

    constructor(private http: HttpClient) { }

    getAllTenants(): Observable<TenantDetail[]> {
        return this.http.get<TenantDetail[]>(`${environment.apiBaseUrl}/super-admin/tenants`);
    }

    onboardRestaurant(data: any): Observable<any> {
        // Note: The backend controller is OnboardingController mapped to /public/onboard
        // Backend returns a plain string, so we must set responseType to 'text' to avoid JSON parse errors
        return this.http.post(`${environment.apiBaseUrl}/public/onboard`, data, { responseType: 'text' });
    }

    extendSubscription(tenantId: string, months: number): Observable<string> {
        return this.http.post(`${this.apiUrl}/tenants/${tenantId}/extend?months=${months}`, {}, { responseType: 'text' });
    }

    suspendTenant(tenantId: string): Observable<string> {
        return this.http.post(`${this.apiUrl}/tenants/${tenantId}/suspend`, {}, { responseType: 'text' });
    }

    reactivateTenant(tenantId: string): Observable<string> {
        return this.http.post(`${this.apiUrl}/tenants/${tenantId}/reactivate`, {}, { responseType: 'text' });
    }
}
