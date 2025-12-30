import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable } from 'rxjs';
import { User } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class StaffService {
    private apiUrl = `${environment.apiBaseUrl}/staff`;

    constructor(private http: HttpClient) { }

    getAllStaff(): Observable<User[]> {
        return this.http.get<User[]>(this.apiUrl);
    }

    deleteStaff(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
