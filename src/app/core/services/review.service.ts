import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Review {
    id?: number;
    restaurantId: string;
    customerId: number;
    customerName: string;
    rating: number; // 1-5
    comment: string;
    adminReply?: string;
    isHidden?: boolean;
    createdAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ReviewService {
    private apiUrl = `${environment.apiBaseUrl}/reviews`;

    constructor(private http: HttpClient) { }

    submitReview(review: Review): Observable<Review> {
        return this.http.post<Review>(this.apiUrl, review);
    }

    getAllReviews(): Observable<Review[]> {
        return this.http.get<Review[]>(`${this.apiUrl}/admin/all`);
    }

    replyToReview(id: number, reply: string): Observable<Review> {
        return this.http.put<Review>(`${this.apiUrl}/${id}/reply`, { reply });
    }

    toggleHide(id: number, isHidden: boolean): Observable<Review> {
        return this.http.put<Review>(`${this.apiUrl}/${id}/hide`, { isHidden });
    }
}
