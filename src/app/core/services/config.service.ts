import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';

export interface PaymentConfig {
    upiId: string;
    qrImageUrl: string;
    defaultMode: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfigService {
    private apiUrl = `${environment.apiBaseUrl}/config`;

    constructor(private http: HttpClient) { }

    getPaymentConfig(): Observable<PaymentConfig | null> {
        return this.http.get<PaymentConfig>(`${this.apiUrl}/payment`).pipe(
            catchError(err => {
                console.error('Failed to load payment config', err);
                return of(null);
            })
        );
    }

    getAllTenants(): Observable<any[]> {
        // TODO: Replace with real API call: this.http.get<any[]>(`${this.apiUrl}/tenants`)
        // For now, return the mock/db list
        return of([
            {
                tenantId: 'Maa-Ashtabhuja',
                name: 'Maa Ashtabhuja Refreshments',
                description: 'Best Tiffin & Thali in Town',
                detailedDescription: 'Pure Veg. We provide superb tiffin services and delicious meals that fit right within your budget.',
                imageUrl: 'assets/images/maa-ashtabhuja-log.png'
            },
            {
                tenantId: 'pizza-hut',
                name: 'Pizza Hut',
                description: 'Tastiest Pizzas',
                detailedDescription: 'Experience the cheesiest pizzas in town with our signature pan crusts and fresh toppings.',
                imageUrl: 'assets/images/logo.png'
            }
        ]);
    }
}
