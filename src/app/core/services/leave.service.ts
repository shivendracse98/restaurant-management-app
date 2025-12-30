import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaveResponse {
    id: number;
    restaurantId: string;
    userId: number;
    userName: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminComments?: string;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class LeaveService {
    private apiUrl = `${environment.apiBaseUrl}/leaves`;

    constructor(private http: HttpClient) { }

    // Staff: Get my leaves
    getMyLeaves(): Observable<LeaveResponse[]> {
        return this.http.get<LeaveResponse[]>(`${this.apiUrl}/my`);
    }

    // Staff: Apply for leave
    apply(payload: { startDate: string; endDate: string; reason: string }): Observable<any> {
        return this.http.post(this.apiUrl, payload);
    }

    // Admin: Get all leaves for restaurant
    getAllLeaves(): Observable<LeaveResponse[]> {
        return this.http.get<LeaveResponse[]>(this.apiUrl);
    }

    // Admin: Update Status
    updateStatus(id: number, status: string, adminComments?: string): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/status`, { status, adminComments });
    }
}
