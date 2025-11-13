// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role?: 'ADMIN' | 'CUSTOMER' | 'STAFF' | string;
  phone?: string;
  address?: string;
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

  constructor(private http: HttpClient) {
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
   * Login - Query backend for user (development)
   * In production, use proper JWT/OAuth
   */
  login(email: string, password: string): Observable<User | null> {
    return this.http.get<User[]>(
      `${this.base}?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    ).pipe(
      map(users => users.length ? users[0] : null),
      tap(user => {
        if (user) {
          this.saveUser(user);
          // Generate a session ID
          const sessionId = this.generateSessionId();
          this.setSessionId(sessionId);
          // Update BehaviorSubject
          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return of(null);
      })
    );
  }

  /**
   * Register new user
   */
  register(name: string, email: string, password: string): Observable<User> {
    const newUser = { name, email, password, role: 'CUSTOMER' };
    return this.http.post<User>(`${this.base}`, newUser).pipe(
      tap(user => {
        // Auto-login after registration
        this.saveUser(user);
        const sessionId = this.generateSessionId();
        this.setSessionId(sessionId);
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('Registration error:', error);
        throw error;
      })
    );
  }

  /**
   * Logout - Clear all session data
   * Use sessionStorage so it clears when browser closes
   */
  logout(): void {
    // Clear from sessionStorage
    sessionStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.sessionKey);
    
    // Also clear from localStorage as backup
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.sessionKey);
    
    // Update BehaviorSubject
    this.currentUserSubject.next(null);
    
    console.log('✓ User logged out, session cleared');
  }

  /**
   * Save user to sessionStorage (clears on browser close)
   * Use localStorage only if "Remember me" is selected
   */
  private saveUser(user: User, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.storageKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Load user from storage (try sessionStorage first, then localStorage)
   */
  private loadUserFromStorage(): User | null {
    // Try sessionStorage first
    let raw = sessionStorage.getItem(this.storageKey);
    
    // Fallback to localStorage
    if (!raw) {
      raw = localStorage.getItem(this.storageKey);
    }
    
    if (!raw) return null;
    
    try {
      return JSON.parse(raw) as User;
    } catch (e) {
      console.error('Failed to parse user from storage:', e);
      return null;
    }
  }

  /**
   * Get current user synchronously
   */
  currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user as Observable
   */
  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!this.currentUser();
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    const user = this.currentUser();
    return !!user && user.role === 'ADMIN';
  }

  /**
   * Check if user is staff
   */
  isStaff(): boolean {
    const user = this.currentUser();
    return !!user && (user.role === 'STAFF' || user.role === 'ADMIN');
  }

  /**
   * Check if user is customer
   */
  isCustomer(): boolean {
    const user = this.currentUser();
    return !!user && user.role === 'CUSTOMER';
  }

  /**
   * Get user token (if using JWT)
   */
  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey) || localStorage.getItem(this.tokenKey);
  }

  /**
   * Set user token
   */
  setToken(token: string, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.tokenKey, token);
  }

  /**
   * Set session ID
   */
  private setSessionId(sessionId: string): void {
    sessionStorage.setItem(this.sessionKey, sessionId);
  }

  /**
   * Get session ID
   */
  getSessionId(): string | null {
    return sessionStorage.getItem(this.sessionKey);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update current user
   */
  updateUser(user: User): void {
    this.saveUser(user);
    this.currentUserSubject.next(user);
  }

  /**
   * Clear all auth data (comprehensive logout)
   */
  clearAuthData(): void {
    this.logout();
  }
}
