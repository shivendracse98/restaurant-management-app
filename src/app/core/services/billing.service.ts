import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

export interface InvoiceSummary {
    id: number;
    invoiceNumber: string;
    date: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'CANCELLED' | 'FAILED';
    pdfUrl?: string;
}

export interface BillingDashboardStats {
    currentMonthTotal: number;
    lastMonthTotal: number;
    yearToDateTotal: number;

    billingCycle: string;
    nextInvoiceDate: string;
    daysRemaining: number;

    baseFee: number;
    usageFee: number;
    usageDescription: string;

    recentInvoices: InvoiceSummary[];
}

export interface BillingPaymentMethod {
    id?: string;
    cardBrand: string; // 'Visa', 'MasterCard', etc.
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
    gatewayType: 'STRIPE' | 'RAZORPAY';
}

export interface BillingContact {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BillingService {

    private apiUrl = `${environment.apiBaseUrl}/billing`;

    constructor(private http: HttpClient) { }

    getDashboardStats(): Observable<BillingDashboardStats> {
        return this.http.get<BillingDashboardStats>(`${this.apiUrl}/dashboard`);
    }

    getAllInvoices(): Observable<InvoiceSummary[]> {
        return this.http.get<InvoiceSummary[]>(`${this.apiUrl}/invoices`);
    }

    downloadInvoicePdf(invoiceId: number): void {
        const url = `${this.apiUrl}/invoices/${invoiceId}/pdf`;
        this.http.get(url, { responseType: 'blob' }).subscribe(blob => {
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `invoice-${invoiceId}.pdf`;
            link.click();
            window.URL.revokeObjectURL(downloadUrl);
        });
    }

    // --- Payment Methods ---

    getPaymentMethods(): Observable<BillingPaymentMethod[]> {
        return this.http.get<BillingPaymentMethod[]>(`${this.apiUrl}/payment-methods`);
    }

    addPaymentMethod(method: BillingPaymentMethod): Observable<BillingPaymentMethod> {
        return this.http.post<BillingPaymentMethod>(`${this.apiUrl}/payment-methods`, method);
    }

    setDefaultPaymentMethod(id: string): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/payment-methods/${id}/default`, {});
    }

    deletePaymentMethod(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/payment-methods/${id}`);
    }

    // --- Billing Contact ---

    getBillingContact(): Observable<BillingContact> {
        return this.http.get<BillingContact>(`${this.apiUrl}/contact`);
    }

    updateBillingContact(contact: BillingContact): Observable<BillingContact> {
        return this.http.post<BillingContact>(`${this.apiUrl}/contact`, contact);
    }
}
