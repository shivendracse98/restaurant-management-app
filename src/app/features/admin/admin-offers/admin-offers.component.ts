import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OfferService, Offer } from '../../../core/services/offer.service';

@Component({
    selector: 'app-admin-offers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-offers.component.html',
    styleUrls: ['./admin-offers.component.scss']
})
export class AdminOffersComponent implements OnInit {
    offers: Offer[] = [];
    offerForm: FormGroup;
    loading = false;
    showForm = false;

    constructor(private offerService: OfferService, private fb: FormBuilder) {
        this.offerForm = this.fb.group({
            code: ['', [Validators.required, Validators.minLength(3)]],
            description: ['', Validators.required],
            discountType: ['PERCENTAGE', Validators.required],
            discountValue: [0, [Validators.required, Validators.min(1)]],
            minOrderAmount: [0, [Validators.required, Validators.min(0)]],
            maxDiscountAmount: [null], // Optional
            expiryDate: [null]
        });
    }

    ngOnInit(): void {
        this.loadOffers();
    }

    loadOffers() {
        this.loading = true;
        this.offerService.getOffers().subscribe({
            next: (data) => {
                this.offers = data;
                this.loading = false;
            },
            error: (err) => {
                console.error('Failed to load offers', err);
                this.loading = false;
            }
        });
    }

    toggleForm() {
        this.showForm = !this.showForm;
    }

    submit() {
        if (this.offerForm.invalid) return;

        this.offerService.createOffer(this.offerForm.value).subscribe({
            next: (offer) => {
                this.offers.push(offer);
                this.showForm = false;
                this.offerForm.reset({ discountType: 'PERCENTAGE', discountValue: 0, minOrderAmount: 0 });
                alert('Coupon Created Successfully!');
            },
            error: (err) => {
                console.error('Failed to create offer', err);
                alert('Failed to create offer');
            }
        });
    }

    deleteOffer(id: number | undefined) {
        if (!id) return;
        if (confirm('Are you sure you want to delete this offer?')) {
            this.offerService.deleteOffer(id).subscribe({
                next: () => {
                    this.offers = this.offers.filter(o => o.id !== id);
                },
                error: (err) => console.error('Failed to delete offer', err)
            });
        }
    }
}
