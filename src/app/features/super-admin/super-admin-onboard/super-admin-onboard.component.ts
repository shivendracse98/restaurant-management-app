import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SuperAdminService } from '../services/super-admin.service';

@Component({
    selector: 'app-super-admin-onboard',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './super-admin-onboard.component.html',
    styleUrls: ['./super-admin-onboard.component.scss']
})
export class SuperAdminOnboardComponent {
    onboardForm: FormGroup;
    loading = false;

    constructor(
        private fb: FormBuilder,
        private superAdminService: SuperAdminService,
        private router: Router
    ) {
        this.onboardForm = this.fb.group({
            restaurantName: ['', [Validators.required, Validators.minLength(3)]],
            ownerName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
            address: ['', Validators.required]
        });
    }

    get f() { return this.onboardForm.controls; }

    onSubmit() {
        if (this.onboardForm.invalid) return;

        this.loading = true;
        this.superAdminService.onboardRestaurant(this.onboardForm.value).subscribe({
            next: () => {
                alert('🎉 Restaurant Onboarded Successfully!');
                this.router.navigate(['/super-admin/dashboard']);
            },
            error: (err) => {
                console.error(err);
                let msg = 'Unknown error';
                if (err.error) {
                    try {
                        // If responseType is 'text', err.error might be a JSON string
                        const parsed = JSON.parse(err.error);
                        msg = parsed.message || parsed.error || err.error;
                    } catch (e) {
                        // Not JSON, just use the string
                        msg = err.error.message || err.error;
                    }
                }
                alert('❌ Onboarding Failed: ' + msg);
                this.loading = false;
            }
        });
    }
}
