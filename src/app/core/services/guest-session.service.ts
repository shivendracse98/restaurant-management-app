import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GuestSessionService {

    private readonly STORAGE_KEY = 'rms_guest_session';
    private readonly TTL_MS = 3 * 60 * 60 * 1000; // 3 Hours in milliseconds

    constructor() { }

    /**
     * Save a verified Guest Session with timestamp.
     */
    saveGuestSession(orderId: number, accessKey: string) {
        const session = {
            orderId: orderId,
            accessKey: accessKey,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    }

    /**
     * Retrieve valid Access Key. Returns null if expired or missing.
     */
    getValidGuestKey(): string | null {
        const item = localStorage.getItem(this.STORAGE_KEY);
        if (!item) return null;

        try {
            const session = JSON.parse(item);
            const now = new Date().getTime();

            // VALIDATION: Is the data older than 4 hours?
            if (now - session.timestamp > this.TTL_MS) {
                console.warn('Guest Session Expired (TTL). Clearing storage.');
                this.clearSession();
                return null;
            }

            return session.accessKey;
        } catch (e) {
            console.error('Corrupt Guest Session Data', e);
            this.clearSession();
            return null;
        }
    }

    /**
     * Retrieve Order ID for UI display (only if valid).
     */
    getValidOrderId(): number | null {
        if (!this.getValidGuestKey()) return null; // Ensure validity first
        const item = localStorage.getItem(this.STORAGE_KEY);
        return item ? JSON.parse(item).orderId : null;
    }

    clearSession() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
}
