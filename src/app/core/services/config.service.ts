import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { catchError, map } from 'rxjs/operators';

export interface PaymentConfig {
    upiId?: string;
    upiQrImageUrl?: string;
    defaultPaymentMode?: string;
    restaurantName?: string;
    restaurantContact?: string;
    restaurantAddress?: string;
    logoUrl?: string;

    // Delivery Config
    isDeliveryEnabled?: boolean;
    isAcceptingDelivery?: boolean;
    serviceablePincodes?: string;
    deliveryFee?: number;
    minOrderAmount?: number;
    freeDeliveryThreshold?: number;
}

export interface PlatformConfig {
    platformName: string;
    supportEmail: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private apiUrl = `${environment.apiBaseUrl}/config`;

    constructor(private http: HttpClient) { }

    getApiBaseUrl(): string {
        return environment.apiBaseUrl;
    }



    getPaymentConfig(): Observable<PaymentConfig | null> {
        return this.http.get<PaymentConfig>(`${this.apiUrl}/payment`).pipe(
            catchError(err => {
                console.error('Failed to load payment config', err);
                return of(null);
            })
        );
    }

    getPlatformConfig(): Observable<PlatformConfig> {
        return this.http.get<PlatformConfig>(`${environment.apiBaseUrl}/public/config/platform`).pipe(
            catchError(err => {
                console.error('Failed to load platform config', err);
                return of({ platformName: 'TasteTown', supportEmail: 'support@tastetown.com' });
            })
        );
    }

    updateConfig(data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}`, data);
    }

    getAllTenants(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/tenants`).pipe(
            map(response => {
                return response.map(t => ({
                    tenantId: t.tenantId,
                    name: t.restaurantName || t.tenantId,
                    description: t.description || 'Delicious food served hot.',
                    detailedDescription: t.detailedDescription || t.restaurantAddress,
                    imageUrl: t.logoUrl
                }));
            }),
            catchError(err => {
                console.error('Failed to load tenants', err);
                // Return generic list if fails, or empty
                return of([]);
            })
        );
    }
}
