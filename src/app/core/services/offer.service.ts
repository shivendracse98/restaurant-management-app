import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Offer {
    id?: number;
    code: string;
    description: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount?: number;
    expiryDate: string;
    isActive: boolean;
}

export interface ValidateCouponResponse {
    valid: boolean;
    message: string;
    discountAmount: number;
    couponCode: string;
}

@Injectable({
    providedIn: 'root'
})
export class OfferService {
    private apiUrl = `${environment.apiBaseUrl}/offers`;

    constructor(private http: HttpClient) { }

    getOffers(): Observable<Offer[]> {
        return this.http.get<Offer[]>(this.apiUrl);
    }

    getActiveOffers(): Observable<Offer[]> {
        return this.http.get<Offer[]>(`${this.apiUrl}/active`);
    }

    createOffer(offer: any): Observable<Offer> {
        return this.http.post<Offer>(this.apiUrl, offer);
    }

    deleteOffer(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    validateCoupon(code: string, cartTotal: number): Observable<ValidateCouponResponse> {
        return this.http.post<ValidateCouponResponse>(`${this.apiUrl}/validate`, { code, cartTotal });
    }
}
