import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { Subscription } from '../../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private base = `${environment.apiBaseUrl}/subscriptions`;

  constructor(private http: HttpClient) {}

  list(): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(this.base);
  }

  get(id: string): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.base}/${id}`);
  }

  create(payload: Partial<Subscription>): Observable<Subscription> {
    return this.http.post<Subscription>(this.base, payload);
  }

  update(id: string, data: Partial<Subscription>): Observable<Subscription> {
    return this.http.patch<Subscription>(`${this.base}/${id}`, data);
  }
}
