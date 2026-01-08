import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MasterMenuItem {
    id?: string;
    tenantGroupId: string;
    name: string;
    description?: string;
    category?: string;
    basePrice: number;
    imageUrl?: string;
    isAvailable?: boolean;
    version?: number;
    createdAt?: string;
    updatedAt?: string;
}


export interface MenuOverride {
    id?: string;
    restaurantId: string;
    masterItemId: string;
    tenantGroupId?: string;
    overridePrice?: number;
    overrideAvailable?: boolean;
    reason?: string;
}

@Injectable({
    providedIn: 'root'
})
export class MasterMenuService {
    private apiUrl = `${environment.apiBaseUrl}/menu/master`;
    private overrideUrl = `${environment.apiBaseUrl}/menu/overrides`;

    constructor(private http: HttpClient) { }

    getAll(groupId: string): Observable<MasterMenuItem[]> {
        return this.http.get<MasterMenuItem[]>(`${this.apiUrl}?groupId=${groupId}`);
    }

    create(item: MasterMenuItem): Observable<MasterMenuItem> {
        return this.http.post<MasterMenuItem>(this.apiUrl, item);
    }

    update(id: string, item: MasterMenuItem): Observable<MasterMenuItem> {
        return this.http.put<MasterMenuItem>(`${this.apiUrl}/${id}`, item);
    }

    getOverrides(restaurantId: string): Observable<MenuOverride[]> {
        return this.http.get<MenuOverride[]>(`${this.overrideUrl}?restaurantId=${restaurantId}`);
    }

    upsertOverride(override: MenuOverride): Observable<MenuOverride> {
        return this.http.post<MenuOverride>(this.overrideUrl, override);
    }
}
