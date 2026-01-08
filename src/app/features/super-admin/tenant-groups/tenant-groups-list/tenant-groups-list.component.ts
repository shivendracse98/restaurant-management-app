import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SuperAdminService } from '../../services/super-admin.service';
import { TenantGroup, GroupStatus } from '../../models/tenant-group.model';
import { TenantGroupDialogComponent } from '../tenant-group-dialog/tenant-group-dialog.component';

@Component({
    selector: 'app-tenant-groups-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        MatCardModule,
        MatChipsModule,
        MatDialogModule,
        FormsModule,
        ReactiveFormsModule
    ],
    templateUrl: './tenant-groups-list.component.html',
    styleUrls: ['./tenant-groups-list.component.css']
})
export class TenantGroupsListComponent implements OnInit {
    displayedColumns: string[] = ['name', 'owner', 'billingModel', 'restaurantCount', 'status', 'actions'];
    dataSource: TenantGroup[] = [];

    // Filters
    searchTerm: string = '';
    filterStatus: string = '';

    // Pagination
    totalElements: number = 0;
    pageSize: number = 10;
    pageIndex: number = 0;

    constructor(
        private superAdminService: SuperAdminService,
        private dialog: MatDialog
    ) { }

    ngOnInit(): void {
        this.loadGroups();
    }

    loadGroups(): void {
        this.superAdminService.getTenantGroups(
            this.pageIndex,
            this.pageSize,
            this.searchTerm,
            this.filterStatus
        ).subscribe({
            next: (response) => {
                this.dataSource = response.content;
                this.totalElements = response.totalElements;
            },
            error: (err) => console.error('Error loading groups', err)
        });
    }

    onPageChange(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        this.loadGroups();
    }

    applyFilter(): void {
        this.pageIndex = 0;
        this.loadGroups();
    }

    openCreateDialog(): void {
        const dialogRef = this.dialog.open(TenantGroupDialogComponent, {
            width: '600px',
            data: { mode: 'create' }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadGroups();
            }
        });
    }

    openEditDialog(group: TenantGroup): void {
        const dialogRef = this.dialog.open(TenantGroupDialogComponent, {
            width: '600px',
            data: { mode: 'edit', group: group }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loadGroups(); // Reload to see changes
            }
        });
    }
}
