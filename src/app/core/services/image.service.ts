import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ImageService {
    private apiUrl = `${environment.apiBaseUrl}/images`;

    constructor(private http: HttpClient) { }

    uploadImage(file: File): Observable<{ id: number, url: string, message: string }> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<{ id: number, url: string, message: string }>(this.apiUrl, formData);
    }
}
