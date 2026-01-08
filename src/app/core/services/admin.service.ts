import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
    todayRevenue: number;
    pendingOrders: number;
    todayOrders: number;
}

export interface AnalyticsPoint {
    label: string;
    revenue: number;
    orderCount: number;
}

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = `${environment.apiBaseUrl}/admin`;

    constructor(private http: HttpClient) { }

    getDashboardStats(): Observable<DashboardStats> {
        return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
    }

    getAnalytics(period: string = 'daily'): Observable<AnalyticsPoint[]> {
        return this.http.get<AnalyticsPoint[]>(`${this.apiUrl}/analytics?period=${period}`);
    }

    getGroupStats(groupId: string): Observable<DashboardStats> {
        return this.http.get<DashboardStats>(`${this.apiUrl}/group-stats`, {
            headers: { 'X-Group-ID': groupId }
        });
    }
}
