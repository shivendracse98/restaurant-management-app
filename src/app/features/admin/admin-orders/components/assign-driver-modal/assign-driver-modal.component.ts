import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DeliveryService } from '../../../../../core/services/delivery.service';

@Component({
  selector: 'app-assign-driver-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <h3>🚚 Assign Delivery Driver</h3>
        <p class="order-id">Order #{{ orderId }}</p>

        <div *ngIf="locationLink" class="location-link-box">
           <strong>📍 Location Link:</strong>
           <a [href]="locationLink" target="_blank" rel="noopener noreferrer">{{ locationLink }}</a>
        </div>

        <form [formGroup]="assignForm" (ngSubmit)="onSubmit()">
          
          <div class="form-group">
            <label>Driver Name</label>
            <input type="text" formControlName="driverName" placeholder="e.g. Ramesh Kumar">
            <div class="error" *ngIf="f['driverName'].touched && f['driverName'].errors">
              Name is required
            </div>
          </div>

          <div class="form-group">
            <label>Driver Phone</label>
            <input type="tel" formControlName="driverPhone" placeholder="10-digit number">
            <div class="error" *ngIf="f['driverPhone'].touched && f['driverPhone'].errors">
              Valid phone required
            </div>
          </div>

          <div class="form-group">
            <label>Vehicle Number</label>
            <input type="text" formControlName="driverVehicle" placeholder="e.g. MH-12-AB-1234">
            <div class="error" *ngIf="f['driverVehicle'].touched && f['driverVehicle'].errors">
              Vehicle info required
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn-cancel" (click)="close()">Cancel</button>
            <button type="submit" class="btn-submit" [disabled]="assignForm.invalid || loading">
              <span *ngIf="!loading">Assign Driver</span>
              <span *ngIf="loading">Assigning...</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex; justify-content: center; align-items: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .modal-content {
      background: white; padding: 2rem; border-radius: 12px;
      width: 90%; max-width: 400px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      animation: slideUp 0.3s ease-out;
    }
    h3 { margin-top: 0; color: #2d3436; margin-bottom: 0.5rem; }
    .order-id { color: #636e72; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.4rem; font-weight: 500; font-size: 0.9rem; }
    input { width: 100%; padding: 0.6rem; border: 1px solid #dfe6e9; border-radius: 6px; font-size: 1rem; }
    input:focus { outline: none; border-color: #0984e3; box-shadow: 0 0 0 2px rgba(9, 132, 227, 0.1); }
    .error { color: #d63031; font-size: 0.8rem; margin-top: 0.2rem; }
    .actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
    button { padding: 0.6rem 1.2rem; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-cancel { background: #f1f2f6; color: #636e72; }
    .btn-cancel:hover { background: #dfe6e9; }
    .btn-submit { background: #00b894; color: white; }
    .btn-submit:hover:not(:disabled) { background: #00a884; transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class AssignDriverModalComponent {
  @Input() orderId: number | null = null;
  @Output() assigned = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  isOpen = false;
  loading = false;
  assignForm: FormGroup;
  deliveryService = inject(DeliveryService);

  constructor(private fb: FormBuilder) {
    this.assignForm = this.fb.group({
      driverName: ['', Validators.required],
      driverPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      driverVehicle: ['', Validators.required]
    });
  }

  open(orderId: number) {
    this.orderId = orderId;
    this.isOpen = true;
    this.assignForm.reset();
    this.locationLink = undefined;
    this.loading = false; // Ensure loading is reset

    // Fetch job immediately to show link
    this.deliveryService.getJobForOrder(orderId).subscribe({
      next: (response: any) => {
        // Handle both direct object and ApiResponse wrapper
        const job = response.data || response;
        if (job) {
          this.locationLink = job.locationLink;
        }
      },
      error: (err) => console.error('Error pre-fetching job:', err)
    });
  }

  close() {
    this.isOpen = false;
    this.cancelled.emit();
  }

  get f() { return this.assignForm.controls; }

  locationLink: string | undefined;

  onSubmit() {
    if (this.assignForm.invalid || !this.orderId) return;

    this.loading = true;

    this.deliveryService.getJobForOrder(this.orderId).subscribe({
      next: (response: any) => {
        const job = response.data || response;
        if (job) {
          this.confirmAssignment(job.id);
        } else {
          alert('No delivery job found for this order. Ensure it is marked READY.');
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('Failed to fetch job', err);
        alert('Could not find delivery job. Is the order READY?');
        this.loading = false;
      }
    });
  }

  private confirmAssignment(jobId: string) {
    if (this.locationLink) {
      console.log("Found location link: ", this.locationLink);
      // In a real app we might show this to the user to copy
      // For now we just log it or maybe append to notes?
    }
    this.deliveryService.assignDriver(jobId, this.assignForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.isOpen = false;
        alert('Driver Assigned Successfully! 🚚');
        this.assigned.emit(); // Parent should refresh list
      },
      error: (err) => {
        console.error('Assignment failed', err);
        alert('Failed to assign driver.');
        this.loading = false;
      }
    });
  }
}
