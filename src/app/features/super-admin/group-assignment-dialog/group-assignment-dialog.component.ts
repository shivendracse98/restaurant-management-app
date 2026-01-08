import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import checking
import { FormsModule } from '@angular/forms';
import { SuperAdminService } from '../services/super-admin.service';

@Component({
    selector: 'app-group-assignment-dialog',
    templateUrl: './group-assignment-dialog.component.html',
    styleUrls: ['./group-assignment-dialog.component.scss']
})
export class GroupAssignmentDialogComponent {
    @Input() restaurantId!: string;
    @Input() restaurantName!: string;
    @Output() close = new EventEmitter<void>();
    @Output() assigned = new EventEmitter<void>();

    searchQuery = '';
    groups: any[] = [];
    selectedGroup: any = null;
    loading = false;
    error = '';
    searching = false;

    constructor(private superAdminService: SuperAdminService) { }

    search(): void {
        if (!this.searchQuery.trim()) return;

        this.searching = true;
        this.error = '';
        this.superAdminService.searchGroups(this.searchQuery).subscribe({
            next: (data) => {
                this.groups = data;
                this.searching = false;
            },
            error: (err) => {
                this.error = 'Failed to search groups';
                this.searching = false;
            }
        });
    }

    selectGroup(group: any): void {
        this.selectedGroup = group;
    }

    assign(): void {
        if (!this.selectedGroup || !this.restaurantId) return;

        this.loading = true;
        this.superAdminService.assignRestaurantToGroup(this.restaurantId, this.selectedGroup.id).subscribe({
            next: () => {
                this.loading = false;
                this.assigned.emit();
                this.close.emit();
            },
            error: (err) => {
                console.error(err);
                this.error = 'Failed to assign group';
                this.loading = false;
            }
        });
    }
}
