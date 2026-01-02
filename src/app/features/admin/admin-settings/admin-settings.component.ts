import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { ConfigService } from '../../../core/services/config.service';
import { ImageService } from '../../../core/services/image.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-admin-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatSlideToggleModule],
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
            address: [''],

            // Delivery
            isDeliveryEnabled: [false], // Master Toggle
            isAcceptingDelivery: [true],
            serviceablePincodes: [''],
            deliveryFee: [0, [Validators.min(0)]],
            minOrderAmount: [0, [Validators.min(0)]],
            freeDeliveryThreshold: [0, [Validators.min(0)]]
        });
    }

    ngOnInit(): void {
        this.loadConfig();
    }

    loadConfig(): void {
        this.loading = true;

        this.configService.getPaymentConfig().subscribe({
            next: (data: any) => {
                const currentUser = this.auth.currentUser();

                this.configForm.patchValue({
                    name: data?.name || currentUser?.restaurantName || '',
                    description: data?.description || '',
                    detailedDescription: data?.detailedDescription || '',
                    logoUrl: data?.logoUrl,

                    upiId: data?.upiId || '',
                    qrImageUrl: data?.upiQrImageUrl || '', // ✅ Fix: Map from backend 'upiQrImageUrl' to local form 'qrImageUrl'
                    defaultMode: data?.defaultPaymentMode || 'CASH',

                    contactPhone: data?.restaurantContact || currentUser?.phone || '',
                    contactEmail: data?.contactEmail || currentUser?.email || '',
                    address: data?.restaurantAddress || '',

                    // Delivery
                    isDeliveryEnabled: data?.isDeliveryEnabled !== undefined ? data.isDeliveryEnabled : false,
                    isAcceptingDelivery: data?.isAcceptingDelivery !== undefined ? data.isAcceptingDelivery : true,
                    serviceablePincodes: data?.serviceablePincodes || '',
                    deliveryFee: data?.deliveryFee || 0,
                    minOrderAmount: data?.minOrderAmount || 0,
                    freeDeliveryThreshold: data?.freeDeliveryThreshold || 0
                });

                if (data?.logoUrl) this.logoPreview = data.logoUrl;
                if (data?.upiQrImageUrl) this.qrPreview = data.upiQrImageUrl; // ✅ Fix: Use correct field for preview

                this.loading = false;
            },
            error: (err: any) => {
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
                next: (res: any) => {
                    this.logoPreview = res.url;
                    this.configForm.patchValue({ logoUrl: res.url });
                    this.uploadingLogo = false;
                    this.toastr.success('Logo uploaded!');
                },
                error: (err: any) => {
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
                next: (res: any) => {
                    this.qrPreview = res.url;
                    this.configForm.patchValue({ qrImageUrl: res.url });
                    this.uploadingQr = false;
                    this.toastr.success('QR Code uploaded!');
                },
                error: (err: any) => {
                    this.toastr.error('QR upload failed');
                    this.uploadingQr = false;
                }
            });
        }
    }

    saveSettings(): void {
        if (this.configForm.invalid) return;

        this.loading = true;
        const formValue = this.configForm.value;

        // Map Form -> Backend DTO (TenantConfigRequest)
        const payload = {
            restaurantName: formValue.name,
            description: formValue.description,
            detailedDescription: formValue.detailedDescription,
            logoUrl: formValue.logoUrl,

            upiId: formValue.upiId,
            upiQrImageUrl: formValue.qrImageUrl, // ✅ Fix: Map local 'qrImageUrl' to backend 'upiQrImageUrl'
            defaultPaymentMode: formValue.defaultMode,

            restaurantContact: formValue.contactPhone,
            restaurantAddress: formValue.address,

            // Delivery
            isDeliveryEnabled: formValue.isDeliveryEnabled,
            isAcceptingDelivery: formValue.isAcceptingDelivery,
            serviceablePincodes: formValue.serviceablePincodes,
            deliveryFee: formValue.deliveryFee,
            minOrderAmount: formValue.minOrderAmount,
            freeDeliveryThreshold: formValue.freeDeliveryThreshold
        };

        this.configService.updateConfig(payload).subscribe({
            next: () => {
                this.toastr.success('Settings saved successfully!');
                this.loading = false;
                // Optionally update Auth User locally if name changed
            },
            error: (err: any) => {
                console.error('Save failed', err);
                this.toastr.error('Failed to save settings');
                this.loading = false;
            }
        });
    }

}
