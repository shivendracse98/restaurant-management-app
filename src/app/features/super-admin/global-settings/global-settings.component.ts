import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle'; // For feature flags later
import { SuperAdminService } from '../services/super-admin.service';
import { AuditLogsComponent } from '../audit-logs/audit-logs.component';

@Component({
    selector: 'app-global-settings',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        AuditLogsComponent
    ],
    templateUrl: './global-settings.component.html',
    styleUrls: ['./global-settings.component.scss']
})
export class GlobalSettingsComponent implements OnInit {
    settings: any[] = [];
    emailSettings: any[] = [];
    paymentSettings: any[] = [];
    platformSettings: any[] = [];

    loading = false;
    testingConnection = false;

    // Track edits
    editMode: { [key: string]: boolean } = {};
    tempValues: { [key: string]: string } = {};

    constructor(
        private superAdminService: SuperAdminService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit(): void {
        this.loadSettings();
    }

    loadSettings() {
        this.loading = true;
        this.superAdminService.getSettings('ALL').subscribe({
            next: (data) => {
                this.settings = data;
                this.categorizeSettings();
                this.loading = false;
            },
            error: (err) => {
                this.snackBar.open('Failed to load settings', 'Close', { duration: 3000 });
                this.loading = false;
            }
        });
    }

    categorizeSettings() {
        this.emailSettings = this.settings.filter(s => s.category === 'EMAIL');
        this.paymentSettings = this.settings.filter(s => s.category === 'PAYMENT');
        this.platformSettings = this.settings.filter(s => s.category === 'PLATFORM');
    }

    // Edit Handling
    enableEdit(key: string, currentValue: string) {
        console.log('Enable Edit for:', key);
        this.editMode = { ...this.editMode, [key]: true };

        // If secret and masked, start empty. Else start with value.
        if (currentValue === '******') {
            this.tempValues[key] = '';
        } else {
            this.tempValues[key] = currentValue;
        }
    }

    cancelEdit(key: string) {
        const newEditMode = { ...this.editMode };
        newEditMode[key] = false;
        this.editMode = newEditMode;
        delete this.tempValues[key];
    }

    saveSetting(setting: any) {
        const newValue = this.tempValues[setting.key];

        // Client-side Validation logic (basic)
        if (!this.validate(setting, newValue)) return;

        this.loading = true;
        this.superAdminService.updateSetting(setting.key, newValue).subscribe({
            next: () => {
                this.snackBar.open('Setting updated', 'Close', { duration: 3000 });
                this.editMode = { ...this.editMode, [setting.key]: false };
                // Update local model
                setting.value = setting.isSecret ? '******' : newValue;
                setting.editedBy = 'You (Just now)';
                setting.editedAt = new Date().toISOString();
                this.loading = false;
            },
            error: (err) => {
                this.snackBar.open('Update failed: ' + err.message, 'Close', { duration: 5000 });
                this.loading = false;
            }
        });
    }

    validate(setting: any, value: string): boolean {
        if (setting.validationRules === 'PORT') {
            const port = parseInt(value);
            if (isNaN(port) || port < 1 || port > 65535) {
                this.snackBar.open('Invalid Port: Must be 1-65535', 'Close', { duration: 3000 });
                return false;
            }
        }
        return true;
    }

    // Testing Connections
    testEmail() {
        this.testingConnection = true;
        this.superAdminService.testEmailConnection().subscribe({
            next: () => {
                this.snackBar.open('✅ Email Sent Successfully!', 'Close', { duration: 5000 });
                this.testingConnection = false;
            },
            error: (err) => {
                this.snackBar.open('❌ Email Test Failed', 'Close', { duration: 5000 });
                this.testingConnection = false;
            }
        });
    }

    testPayment(gateway: string) {
        this.testingConnection = true;
        this.superAdminService.testPaymentConnection(gateway).subscribe({
            next: () => {
                this.snackBar.open(`✅ ${gateway} Configuration Verified!`, 'Close', { duration: 5000 });
                this.testingConnection = false;
            },
            error: (err) => {
                this.snackBar.open(`❌ ${gateway} Test Failed`, 'Close', { duration: 5000 });
                this.testingConnection = false;
            }
        });
    }
}
