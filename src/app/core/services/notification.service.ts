
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
    shareViaSMS(phoneNumber: string, message: string): void {
        const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        window.location.href = url;
    }
}
