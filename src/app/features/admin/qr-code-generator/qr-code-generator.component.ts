import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';
import { TenantService } from '../../../core/services/tenant.service';

@Component({
  selector: 'app-qr-code-generator',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeModule],
  templateUrl: './qr-code-generator.component.html',
  styleUrls: ['./qr-code-generator.component.scss']
})
export class QrCodeGeneratorComponent {
  tableNumber: string = '';
  qrData: string = '';
  tenantId: string = '';
  baseUrl: string = '';

  constructor(private tenantService: TenantService) {
    this.tenantId = this.tenantService.getTenantId() || 'default';
    this.baseUrl = window.location.origin;
  }

  generate() {
    if (!this.tableNumber) return;
    // URL format: http://domain.com/menu?tableId=5&restaurantId=my-restaurant
    // This allows the Menu page to capture table/restaurant context.
    this.qrData = `${this.baseUrl}/menu?tableId=${this.tableNumber}&restaurantId=${this.tenantId}`;
  }

  print() {
    window.print();
  }
}
