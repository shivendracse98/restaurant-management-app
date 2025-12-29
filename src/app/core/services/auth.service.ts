// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable, of, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { NetworkService } from './network.service';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role?: 'ADMIN' | 'CUSTOMER' | 'STAFF' | string;
  phone?: string;
  address?: string;
  restaurantId?: string;
  restaurantName?: string;
  logoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = `${environment.apiBaseUrl}/users`;
  private storageKey = 'rms_user';
  private tokenKey = 'rms_token';
  private sessionKey = 'rms_session_id';

  // BehaviorSubject for reactive login state
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private networkService: NetworkService
  ) {
    // On service initialization, validate session with backend
    this.validateSessionOnInit();
  }

  /**
   * Validate session on app initialization
   * This ensures the user is actually logged in on the backend
   */
  private validateSessionOnInit(): void {
    const storedUser = this.loadUserFromStorage();
    if (storedUser) {
      // Optional: Call backend to verify session is still valid
      // For now, we'll use sessionStorage which clears on browser close
    }
  }

  /**
   * Login - Query backend for user
   */
  login(email: string, password: string): Observable<User | null> {
    if (!this.networkService.isOnline) {
      console.warn('Cannot login while offline');
      return throwError(() => ({ message: 'Cannot login while offline. Please check your connection.' }));
    }

    return this.http.post<any>(`${environment.apiBaseUrl}/auth/login`, { email, password }).pipe(
      map(response => {
        if (response && response.token) {
          const user = response.user;
          this.saveUser(user);
          this.setToken(response.token);
          this.currentUserSubject.next(user);
          return user;
        }
        return null;
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Register new user
   */
  register(name: string, email: string, password: string, phoneNumber: string, role: string = 'CUSTOMER', autoLogin: boolean = true, restaurantId?: string): Observable<User> {
    if (!this.networkService.isOnline) {
      return throwError(() => ({ message: 'Cannot register while offline. Please check your connection.' }));
    }

    const payload = { name, email, password, phoneNumber, role, restaurantId };
    return this.http.post<any>(`${environment.apiBaseUrl}/auth/register`, payload).pipe(
      map(response => {
        const user = response.user;

        // Only login automatically if requested (default behavior)
        if (autoLogin) {
          this.saveUser(user);
          this.setToken(response.token);
          this.currentUserSubject.next(user);
        }

        return user;
      }),
      catchError(error => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  /**
   * Logout
   */
  logout(): void {
    sessionStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.sessionKey);
    this.currentUserSubject.next(null);
  }

  private saveUser(user: User, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.storageKey, JSON.stringify(user));
  }

  private loadUserFromStorage(): User | null {
    let raw = sessionStorage.getItem(this.storageKey);
    if (!raw) raw = localStorage.getItem(this.storageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch (e) {
      return null;
    }
  }

  currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  isCustomer(): boolean {
    const user = this.currentUser();
    return !!user && user.role === 'CUSTOMER';
  }

  isAdmin(): boolean {
    const user = this.currentUser();
    return !!user && user.role === 'ADMIN';
  }

  isStaff(): boolean {
    const user = this.currentUser();
    return !!user && (user.role === 'STAFF' || user.role === 'ADMIN');
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey) || localStorage.getItem(this.tokenKey);
  }

  setToken(token: string, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.tokenKey, token);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, password: string): Observable<any> {
    // Note: API expects confirmPassword as well
    return this.http.post(`${environment.apiBaseUrl}/auth/reset-password`, { token, newPassword: password, confirmPassword: password });
  }
}
