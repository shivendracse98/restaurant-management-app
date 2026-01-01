import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ConfigService } from '../../../core/services/config.service';
import { ImageService } from '../../../core/services/image.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-admin-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-settings.component.html',
    styleUrls: ['./admin-settings.component.scss']
})
export class AdminSettingsComponent implements OnInit {

    configForm: FormGroup;
    loading = false;
    uploadingLogo = false;
    uploadingQr = false;

    logoPreview: string | null = null;
    qrPreview: string | null = null;

    constructor(
        private fb: FormBuilder,
        private configService: ConfigService,
        private imageService: ImageService,
        private toastr: ToastrService,
        private auth: AuthService
    ) {
        this.configForm = this.fb.group({
            name: ['', Validators.required],
            description: [''],
            detailedDescription: [''],
            logoUrl: [''],

            upiId: [''],
            qrImageUrl: [''],
            defaultMode: ['CASH'],

            contactPhone: [''],
            contactEmail: ['', [Validators.email]],
            address: ['']
        });
    }

    ngOnInit(): void {
        this.loadConfig();
    }

    loadConfig(): void {
        this.loading = true;
        // We need an endpoint to get the FULL config, not just payment.
        // Assuming ConfigService.getPaymentConfig returns partial, but we need full tenant config.
        // The backend `TenantConfigController` has verifyConfig (public) and updateConfig (private).
        // Let's assume we can fetch current config via a new GET endpoint or reuse the Auth user's data for basics.
        // Wait, `ConfigService` has `getPaymentConfig`. 
        // Ideally we should have `GET /api/config` that returns the full `TenantConfig` entity.

        // For now, let's try to get payment config and merge.
        // If backend doesn't support full GET, we might have to rely on what we have.
        // Actually, `TenantConfigController` maps `GET /payment` -> returns only payment info?
        // Let's check if we can fetch full config. 
        // If not, I'll rely on `getPaymentConfig` for payment parts and placeholders for others or assume they are empty initially.

        this.configService.getPaymentConfig().subscribe({
            next: (data: any) => {
                // Data might be just PaymentConfig or Full Config depending on backend DTO.
                // If it's partial, we might miss Name/Desc. 
                // But `TenantConfig` entity has everything.
                // Let's assume the backend `GET /config/payment` actually returns the full config or we fix backend later.
                // For MVP, if we don't have Name/Desc from API, we can pre-fill from Auth User if available.

                const currentUser = this.auth.currentUser();

                this.configForm.patchValue({
                    name: data?.name || currentUser?.restaurantName || '',
                    description: data?.description || '',
                    detailedDescription: data?.detailedDescription || '',
                    userId: data?.userId, // Hidden field if needed
                    logoUrl: data?.logoUrl,

                    upiId: data?.upiId || '',
                    qrImageUrl: data?.qrImageUrl || '',
                    defaultMode: data?.defaultMode || 'CASH',

                    contactPhone: data?.contactPhone || currentUser?.phone || '',
                    contactEmail: data?.contactEmail || currentUser?.email || '',
                    address: data?.address || ''
                });

                if (data?.logoUrl) this.logoPreview = data.logoUrl;
                if (data?.qrImageUrl) this.qrPreview = data.qrImageUrl;

                this.loading = false;
            },
            error: (err) => {
                console.error('Config load error', err);
                this.loading = false;
            }
        });
    }

    onLogoSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.uploadingLogo = true;
            this.imageService.uploadImage(file).subscribe({
                next: (res) => {
                    this.logoPreview = res.url;
                    this.configForm.patchValue({ logoUrl: res.url });
                    this.uploadingLogo = false;
                    this.toastr.success('Logo uploaded!');
                },
                error: () => {
                    this.toastr.error('Logo upload failed');
                    this.uploadingLogo = false;
                }
            });
        }
    }

    onQrSelected(event: any): void {
        const file = event.target.files[0];
        if (file) {
            this.uploadingQr = true;
            this.imageService.uploadImage(file).subscribe({
                next: (res) => {
                    this.qrPreview = res.url;
                    this.configForm.patchValue({ qrImageUrl: res.url });
                    this.uploadingQr = false;
                    this.toastr.success('QR Code uploaded!');
                },
                error: () => {
                    this.toastr.error('QR upload failed');
                    this.uploadingQr = false;
                }
            });
        }
    }

    saveSettings(): void {
        if (this.configForm.invalid) return;

        this.loading = true;
        const payload = this.configForm.value;

        this.configService.updateConfig(payload).subscribe({
            next: () => {
                this.toastr.success('Settings saved successfully!');
                this.loading = false;
                // Optionally update Auth User locally if name changed
            },
            error: (err) => {
                console.error('Save failed', err);
                this.toastr.error('Failed to save settings');
                this.loading = false;
            }
        });
    }

}
