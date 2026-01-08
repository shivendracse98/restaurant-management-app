import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BillingService, BillingPaymentMethod, BillingContact } from '../../../../core/services/billing.service';

@Component({
    selector: 'app-payment-methods',
    standalone: true,
    imports: [CommonModule, FormsModule, MatIconModule, RouterModule],
    templateUrl: './payment-methods.component.html',
    styleUrls: ['./payment-methods.component.scss']
})
export class PaymentMethodsComponent implements OnInit {
    paymentMethods: BillingPaymentMethod[] = [];
    contact: BillingContact = { name: '', email: '' };

    showAddCard = false;
    newCard = {
        cardNumber: '',
        expMonth: '',
        expYear: '',
        cvv: ''
    };

    loading = false;
    savingContact = false;

    constructor(private billingService: BillingService) { }

    ngOnInit(): void {
        this.loadData();
    }

    loadData() {
        this.loading = true;
        this.billingService.getPaymentMethods().subscribe(data => {
            this.paymentMethods = data;
        });
        this.billingService.getBillingContact().subscribe(data => {
            if (data) this.contact = data;
        });
        this.loading = false;
    }

    addNewCard() {
        // In a real App, this would use Stripe Elements / Keys
        // Here we mock adding a card
        const method: BillingPaymentMethod = {
            cardBrand: 'Visa', // Auto-detect in real app
            last4: this.newCard.cardNumber.slice(-4),
            expMonth: parseInt(this.newCard.expMonth),
            expYear: parseInt(this.newCard.expYear),
            isDefault: false,
            gatewayType: 'STRIPE'
        };

        this.billingService.addPaymentMethod(method).subscribe(() => {
            this.showAddCard = false;
            this.loadData();
            this.newCard = { cardNumber: '', expMonth: '', expYear: '', cvv: '' };
        });
    }

    setDefault(id: string) {
        this.billingService.setDefaultPaymentMethod(id).subscribe(() => {
            this.loadData();
        });
    }

    deleteMethod(id: string) {
        if (confirm('Are you sure you want to remove this payment method?')) {
            this.billingService.deletePaymentMethod(id).subscribe(() => {
                this.loadData();
            });
        }
    }

    saveContact() {
        this.savingContact = true;
        this.billingService.updateBillingContact(this.contact).subscribe(() => {
            this.savingContact = false;
            alert('Billing contact updated successfully');
        });
    }
}
