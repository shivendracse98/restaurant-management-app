import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

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

    constructor(private router: Router) { }

    onSubmit() {
        this.loading.set(true);

        // Simulate API Call
        setTimeout(() => {
            this.loading.set(false);
            this.submitted.set(true);
            // In real app: Call Backend Service here
        }, 1500);
    }

    goHome() {
        this.router.navigate(['/']);
    }
}
