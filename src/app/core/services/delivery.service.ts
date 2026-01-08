import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DriverDetails {
    driverName: string;
    driverPhone: string;
    driverVehicle: string;
}

export interface DeliveryJob {
    id: string;
    orderId: number;
    status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
    driverName?: string;
    driverPhone?: string;
    driverVehicle?: string;
    deliveryMode: 'SELF' | 'DAAS';
    locationLink?: string;
}

@Injectable({
    providedIn: 'root'
})
export class DeliveryService {
    private apiUrl = `${environment.apiBaseUrl}/delivery`;

    constructor(private http: HttpClient) { }

    // Get delivery job associated with an order
    getJobForOrder(orderId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/order/${orderId}`);
    }

    // Assign a driver (Self Delivery)
    assignDriver(jobId: string, details: DriverDetails): Observable<DeliveryJob> {
        return this.http.post<DeliveryJob>(`${this.apiUrl}/${jobId}/assign-driver`, details);
    }

    // Mark picked up (optional, for future use)
    markPickedUp(jobId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${jobId}/status/picked-up`, {});
    }

    // Mark delivered (optional, for future use)
    markDelivered(jobId: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/${jobId}/status/delivered`, {});
    }
}
