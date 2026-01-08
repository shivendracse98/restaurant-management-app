import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuperAdminService } from '../../services/super-admin.service';

@Component({
    selector: 'app-platform-users',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatChipsModule
    ],
    template: `
    <div class="sa-container">
      <div class="header">
        <h1>Platform Team</h1>
        <p class="subtitle">Manage internal staff (Finance, Admins)</p>
      </div>

      <!-- Invite User Form (Toggleable) -->
      <div class="invite-section" *ngIf="showInviteForm">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Invite New Member</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Full Name</mat-label>
                <input matInput [(ngModel)]="newUser.name" placeholder="John Doe">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email Address</mat-label>
                <input matInput [(ngModel)]="newUser.email" placeholder="john@tastetown.com">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Role</mat-label>
                <mat-select [(ngModel)]="newUser.role">
                  <mat-option value="FINANCE_TEAM">Finance Team</mat-option>
                  <mat-option value="SUPER_ADMIN">Super Admin</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Temporary Password</mat-label>
                <input matInput [(ngModel)]="newUser.password" type="text">
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions align="end">
            <button mat-button (click)="showInviteForm = false">Cancel</button>
            <button mat-raised-button color="primary" (click)="inviteUser()" [disabled]="!isValid()">
              <mat-icon>send</mat-icon> Send Invite
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- Action Bar -->
      <div class="controls-bar" *ngIf="!showInviteForm">
        <button mat-raised-button color="primary" (click)="showInviteForm = true">
          <mat-icon>person_add</mat-icon> Invite Member
        </button>
      </div>

      <!-- Users Table -->
      <div class="card table-responsive">
        <table mat-table [dataSource]="users" class="modern-table">
          
          <!-- Name -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef> Name </th>
            <td mat-cell *matCellDef="let user">
               <div class="user-cell">
                 <div class="avatar">{{ getInitials(user.name) }}</div>
                 <div class="info">
                   <div class="name">{{ user.name }}</div>
                   <div class="email">{{ user.email }}</div>
                 </div>
               </div>
            </td>
          </ng-container>

          <!-- Role -->
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef> Role </th>
            <td mat-cell *matCellDef="let user">
              <span class="role-badge" [class]="user.role">{{ user.role.replace('_', ' ') }}</span>
            </td>
          </ng-container>

          <!-- Status -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Status </th>
            <td mat-cell *matCellDef="let user">
              <mat-chip-option [color]="user.isActive ? 'accent' : 'warn'" selected>
                {{ user.isActive ? 'Active' : 'Inactive' }}
              </mat-chip-option>
            </td>
          </ng-container>

          <!-- Actions -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Actions </th>
            <td mat-cell *matCellDef="let user">
              <button mat-icon-button [color]="user.isActive ? 'warn' : 'accent'" 
                      (click)="toggleStatus(user)"
                      matTooltip="Toggle Status">
                <mat-icon>{{ user.isActive ? 'block' : 'check_circle' }}</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <div class="empty-state" *ngIf="users.length === 0">
           No internal staff found.
        </div>
      </div>
    </div>
  `,
    styles: [`
    .sa-container { padding: 2rem; background-color: #f8fafc; min-height: 100vh; }
    .header h1 { font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0; }
    .subtitle { color: #64748b; margin-top: 0.5rem; }
    
    .invite-section { margin-bottom: 2rem; }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    mat-form-field { flex: 1; min-width: 200px; }

    .controls-bar { margin-bottom: 2rem; display: flex; justify-content: flex-end; }

    .user-cell { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #475569; }
    .name { font-weight: 500; color: #0f172a; }
    .email { font-size: 0.8rem; color: #64748b; }

    .role-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .role-badge.FINANCE_TEAM { background: #dbeafe; color: #1e40af; }
    .role-badge.SUPER_ADMIN { background: #fce7f3; color: #9d174d; }

    .modern-table { width: 100%; background: white; border-radius: 8px; overflow: hidden; }
    .empty-state { padding: 2rem; text-align: center; color: #94a3b8; }
  `]
})
export class PlatformUsersComponent implements OnInit {
    users: any[] = [];
    displayedColumns = ['name', 'role', 'status', 'actions'];

    showInviteForm = false;
    newUser = {
        name: '',
        email: '',
        role: 'FINANCE_TEAM',
        password: ''
    };

    constructor(
        private superAdminService: SuperAdminService,
        private snackBar: MatSnackBar
    ) { }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.superAdminService.getPlatformUsers().subscribe({
            next: (data) => this.users = data,
            error: (err) => console.error(err)
        });
    }

    inviteUser() {
        this.superAdminService.createPlatformUser(this.newUser).subscribe({
            next: () => {
                this.snackBar.open('User invited successfully!', 'Close', { duration: 3000 });
                this.showInviteForm = false;
                this.newUser = { name: '', email: '', role: 'FINANCE_TEAM', password: '' }; // Reset
                this.loadUsers();
            },
            error: (err) => {
                this.snackBar.open('Failed to invite user: ' + (err.error || 'Unknown error'), 'Close', { duration: 5000 });
            }
        });
    }

    toggleStatus(user: any) {
        if (confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'reactivate'} ${user.name}?`)) {
            this.superAdminService.toggleUserStatus(user.id).subscribe({
                next: () => {
                    this.snackBar.open('Status updated', 'Close', { duration: 2000 });
                    this.loadUsers();
                },
                error: (err) => this.snackBar.open('Failed to update status', 'Close', { duration: 3000 })
            });
        }
    }

    getInitials(name: string): string {
        return name ? name.substring(0, 2).toUpperCase() : '??';
    }

    isValid() {
        return this.newUser.name && this.newUser.email && this.newUser.password;
    }
}
