import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-partner-with-us',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './partner-with-us.component.html',
    styleUrls: ['./partner-with-us.component.scss']
})
export class PartnerWithUsComponent {
    // Form State
    formData = signal({
        restaurantName: '',
        ownerName: '',
        city: '', // Default
        phone: '',
        email: ''
    });

    submitted = signal(false);
    loading = signal(false);

    // ROI Calculator Stats
    dailyOrders = signal(20);
    avgOrderValue = signal(400);

    // Competitor Commission (e.g. 25%) vs TasteTown (10%)
    competitorCost = computed(() => (this.dailyOrders() * this.avgOrderValue() * 30) * 0.25);
    ourCost = computed(() => (this.dailyOrders() * this.avgOrderValue() * 30) * 0.10);
    monthlySavings = computed(() => this.competitorCost() - this.ourCost());

    constructor(
        private router: Router,
        private http: HttpClient
    ) { }

    onSubmit() {
        this.loading.set(true);
        const url = `${environment.apiBaseUrl}/public/contact/restaurant`;

        this.http.post(url, this.formData()).subscribe({
            next: (res) => {
                this.loading.set(false);
                this.submitted.set(true);
            },
            error: (err) => {
                console.error('Submission failed', err);
                this.loading.set(false);
                alert('Something went wrong. Please try again.');
            }
        });
    }

    goHome() {
        this.router.navigate(['/']);
    }
}
