import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { StaffService } from '../../../core/services/staff.service';
import { LeaveService, LeaveResponse } from '../../../core/services/leave.service';
import { AuthService, User } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
    selector: 'app-staff-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatTabsModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatCardModule,
        MatSelectModule,
        MatInputModule
    ],
    templateUrl: './staff-management.component.html',
    styleUrls: ['./staff-management.component.scss']
})
export class StaffManagementComponent implements OnInit {
    // Staff Tab Data
    staffList: User[] = [];
    staffColumns: string[] = ['name', 'email', 'phone', 'role', 'actions'];

    // Leave Tab Data
    leaveList: LeaveResponse[] = [];
    leaveColumns: string[] = ['staffName', 'dates', 'reason', 'status', 'actions'];

    // Basic loader
    loading = false;

    // Add Staff Form (Inline)
    addStaffForm!: FormGroup;
    showAddStaff = false;

    constructor(
        private staffService: StaffService,
        private leaveService: LeaveService,
        private authService: AuthService,
        private fb: FormBuilder,
        private toastr: ToastrService
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.loadStaff();
        this.loadLeaves();

        // Poll for new leaves every 15 seconds
        import('rxjs').then(rxjs => {
            rxjs.timer(15000, 15000).subscribe(() => {
                this.loadLeaves();
            });
        });
    }

    initForm(): void {
        this.addStaffForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            phoneNumber: ['', [Validators.pattern(/^\d{10}$/)]],
            role: ['STAFF', Validators.required]
        });
    }

    // --- Staff Logic ---
    loadStaff(): void {
        this.loading = true;
        this.staffService.getAllStaff().subscribe({
            next: (users: User[]) => {
                this.staffList = users;
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error loading staff:', err);
                this.toastr.error('Failed to load staff list');
                this.loading = false;
            }
        });
    }

    deleteStaff(user: User): void {
        if (confirm(`Are you sure you want to remove ${user.name}? This cannot be undone.`)) {
            this.staffService.deleteStaff(user.id).subscribe({
                next: () => {
                    this.toastr.success('Staff member removed');
                    this.loadStaff();
                },
                error: (err: any) => {
                    this.toastr.error('Failed to delete staff');
                }
            });
        }
    }

    toggleAddStaff(): void {
        this.showAddStaff = !this.showAddStaff;
    }

    createStaff(): void {
        if (this.addStaffForm.invalid) return;

        this.loading = true;
        const val = this.addStaffForm.value;

        // Using AuthService.register
        this.authService.register(val.name, val.email, val.password, val.phoneNumber, val.role, false).subscribe({
            next: () => {
                this.toastr.success('Staff member added successfully');
                this.showAddStaff = false;
                this.addStaffForm.reset({ role: 'STAFF' });
                this.loadStaff();
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Add Staff Error:', err);
                this.toastr.error('Failed to create staff account');
                this.loading = false;
            }
        });
    }

    // --- Leave Logic ---
    loadLeaves(): void {
        // Load ALL leaves for admin
        this.leaveService.getAllLeaves().subscribe({
            next: (leaves: LeaveResponse[]) => {
                // Sort by date desc
                this.leaveList = leaves.sort((a: LeaveResponse, b: LeaveResponse) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
            },
            error: (err: any) => console.error('Error loading leaves:', err)
        });
    }

    approveLeave(leave: LeaveResponse): void {
        if (confirm('Approve this leave request?')) {
            this.leaveService.updateStatus(leave.id, 'APPROVED', 'Approved by Admin').subscribe({
                next: () => {
                    this.toastr.success('Leave Approved');
                    this.loadLeaves();
                },
                error: () => this.toastr.error('Action failed')
            });
        }
    }

    rejectLeave(leave: LeaveResponse): void {
        const reason = prompt('Reason for rejection:');
        if (reason === null) return; // Cancelled

        this.leaveService.updateStatus(leave.id, 'REJECTED', reason).subscribe({
            next: () => {
                this.toastr.info('Leave Rejected');
                this.loadLeaves();
            },
            error: () => this.toastr.error('Action failed')
        });
    }
}
