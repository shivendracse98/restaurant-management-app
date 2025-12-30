
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor() { }

    /**
     * Generates a WhatsApp deep link to share the bill
     * @param phoneNumber Pure number (e.g., 919876543210)
     * @param message Text to send
     */
    shareViaWhatsApp(phoneNumber: string, message: string): void {
        // Ensure no spaces or special chars in phone, maybe validate country code
        // For now, assume input is reasonably clean or strip non-digits
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        // Encode message
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        // Open in new tab
        window.open(url, '_blank');
    }

    /**
     * Generates an SMS link (fallback)
     */
    /**
     * Generates an SMS link (fallback)
     */
    shareViaSMS(phoneNumber: string, message: string): void {
        const ua = navigator.userAgent.toLowerCase();
        // iOS requires '&', Android usually '?' but accepts '?' mostly.
        // Standard is '?' but iOS is quirky.
        const sep = (ua.indexOf("iphone") > -1 || ua.indexOf("ipad") > -1) ? "&" : "?";
        const url = `sms:${phoneNumber}${sep}body=${encodeURIComponent(message)}`;

        window.open(url, '_blank');
    }

    /**
     * Uses the Web Share API if available (Mobile Native Share Sheet)
     * This is the best "One Click" experience as it opens recent contacts instantly.
     */
    async shareNative(title: string, text: string): Promise<boolean> {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: text
                });
                return true;
            } catch (err) {
                console.error('Share failed/cancelled', err);
                return false;
            }
        }
        return false;
    }
}
