import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TenantDetail } from '../models/tenant-detail.model';

@Injectable({
    providedIn: 'root'
})
export class SuperAdminService {
    private apiUrl = `${environment.apiBaseUrl}/super-admin`;

    constructor(private http: HttpClient) { }

    getAuditLogs(
        page: number,
        size: number,
        entityType?: string,
        action?: string,
        performedBy?: string,
        fromDate?: string | null,
        toDate?: string | null
    ): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (entityType) params = params.set('entityType', entityType);
        if (action) params = params.set('action', action);
        if (performedBy) params = params.set('performedBy', performedBy);
        if (fromDate) params = params.set('fromDate', fromDate);
        if (toDate) params = params.set('toDate', toDate);

        return this.http.get(`${this.apiUrl}/audit-logs`, { params });
    }

    // --- Tenants ---
    getAllTenants(): Observable<TenantDetail[]> {
        return this.http.get<TenantDetail[]>(`${environment.apiBaseUrl}/super-admin/tenants`);
    }

    onboardRestaurant(data: any): Observable<any> {
        // Note: The backend controller is OnboardingController mapped to /public/onboard
        // Backend returns a plain string, so we must set responseType to 'text' to avoid JSON parse errors
        return this.http.post(`${environment.apiBaseUrl}/public/onboard`, data, { responseType: 'text' });
    }

    getPublicPlans(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiBaseUrl}/public/plans`);
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

    // Feature Flags
    private get featureFlagBaseUrl(): string {
        // Ensure we don't duplicate /api if it's already in the base URL
        const base = environment.apiBaseUrl.replace(/\/api\/?$/, '');
        return `${base}/api/feature-flags`;
    }

    enableFeature(tenantId: string, feature: string): Observable<string> {
        return this.http.post(`${this.featureFlagBaseUrl}/enable?feature=${feature}&tenantId=${tenantId}`, {}, { responseType: 'text' });
    }

    disableFeature(tenantId: string, feature: string): Observable<string> {
        return this.http.post(`${this.featureFlagBaseUrl}/disable?feature=${feature}&tenantId=${tenantId}`, {}, { responseType: 'text' });
    }

    // --- Group Management ---

    searchGroups(query: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/groups?query=${query}`);
    }

    assignRestaurantToGroup(restaurantId: string, groupId: string): Observable<string> {
        return this.http.post(`${this.apiUrl}/restaurants/${restaurantId}/group`, { groupId }, { responseType: 'text' });
    }

    // --- Tenant Groups Management ---

    getTenantGroups(
        page: number,
        size: number,
        search?: string,
        status?: string
    ): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (search) params = params.set('search', search);
        if (status) params = params.set('status', status);

        return this.http.get(`${this.apiUrl}/groups`, { params });
    }

    getTenantGroup(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/groups/${id}`);
    }

    createTenantGroup(group: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/groups`, group);
    }

    updateTenantGroup(id: string, group: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/groups/${id}`, group);
    }

    getGroupRestaurants(groupId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/groups/${groupId}/restaurants`);
    }

    removeRestaurantFromGroup(groupId: string, restaurantId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/groups/${groupId}/restaurants/${restaurantId}`);
    }

    getGroupAnalytics(groupId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/groups/${groupId}/analytics`);
    }

    getGroupInvoices(groupId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/groups/${groupId}/invoices`);
    }

    upgradeGroupPlan(groupId: string, newPlanSlug: string): Observable<string> {
        return this.http.post(`${this.apiUrl}/groups/${groupId}/upgrade`, { newPlanSlug }, { responseType: 'text' });
    }


    // --- Global Settings ---

    getSettings(category: string = 'ALL'): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/settings?category=${category}`);
    }

    updateSetting(key: string, value: string): Observable<string> {
        return this.http.put(`${this.apiUrl}/settings/${key}`, { value }, { responseType: 'text' });
    }

    testEmailConnection(): Observable<string> {
        return this.http.post(`${this.apiUrl}/settings/test-email`, {}, { responseType: 'text' });
    }

    testPaymentConnection(gateway: string): Observable<string> {
        return this.http.post(`${this.apiUrl}/settings/test-payment?gateway=${gateway}`, {}, { responseType: 'text' });
    }

    // --- Global Analytics ---
    getGlobalAnalytics(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/analytics/global`);
    }

    // ==========================================
    // BILLING & INVOICES
    // ==========================================

    getBillingStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/billing/stats`);
    }

    getInvoices(
        page: number,
        size: number,
        status?: string,
        tenantId?: string,
        fromDate?: string | null,
        toDate?: string | null
    ): Observable<any> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (status) params = params.set('status', status);
        if (tenantId) params = params.set('tenantId', tenantId);
        if (fromDate) params = params.set('fromDate', fromDate);
        if (toDate) params = params.set('toDate', toDate);

        return this.http.get(`${this.apiUrl}/billing/invoices`, { params });
    }

    getInvoiceById(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/billing/invoices/${id}`);
    }

    // --- Platform Staff Management ---
    getPlatformUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/users`);
    }

    createPlatformUser(data: any): Observable<string> {
        return this.http.post(`${this.apiUrl}/users`, data, { responseType: 'text' });
    }

    toggleUserStatus(userId: number): Observable<string> {
        return this.http.put(`${this.apiUrl}/users/${userId}/status`, {}, { responseType: 'text' });
    }

    // --- Subscription Plan Manager ---
    getAdminPlans(): Observable<any[]> {
        return this.http.get<any[]>(`${environment.apiBaseUrl}/admin/plans`);
    }

    createPlan(data: any): Observable<any> {
        return this.http.post(`${environment.apiBaseUrl}/admin/plans`, data);
    }

    updatePlan(id: string, data: any): Observable<any> {
        return this.http.put(`${environment.apiBaseUrl}/admin/plans/${id}`, data);
    }

    togglePlanStatus(id: string): Observable<void> {
        return this.http.delete<void>(`${environment.apiBaseUrl}/admin/plans/${id}`);
    }
}
