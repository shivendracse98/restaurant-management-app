// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role?: 'ADMIN' | 'CUSTOMER' | string;
  phone?: string;
  address?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiBaseUrl}/users`;
  private storageKey = 'rms_user';

  constructor(private http: HttpClient) {}

  // Login using json-server query (dev only)
  login(email: string, password: string): Observable<User | null> {
    return this.http.get<User[]>(`${this.base}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
      .pipe(
        map(users => users.length ? users[0] : null),
        tap(user => {
          if (user) this.saveUser(user);
        })
      );
  }

  // Register (create user)
  register(name: string, email: string, password: string) {
    const newUser = { name, email, password, role: 'CUSTOMER' };
    return this.http.post<any>(`${this.base}/users`, newUser);
  }


  // Save user to localStorage
  saveUser(user: User) {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  // Logout
  logout() {
    localStorage.removeItem(this.storageKey);
    // optional: navigate to home handled by caller
  }

  // Current user getter (synchronous)
  currentUser(): User | null {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  }

  // is logged in
  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  // is admin
  isAdmin(): boolean {
    const u = this.currentUser();
    return !!u && u.role === 'ADMIN';
  }
    // returns true if current user is staff (or admin, if you want admins to access staff pages)
  isStaff(): boolean {
    const u = this.currentUser();
    return !!u && (u.role === 'STAFF' || u.role === 'ADMIN'); // allow admin too
  }

}
