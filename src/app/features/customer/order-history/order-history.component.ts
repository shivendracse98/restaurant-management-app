import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Added form module
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService, Review } from '../../../core/services/review.service';
import { ToastrService } from 'ngx-toastr';
import { Order } from '../../../models/order.model';
import { Observable, of } from 'rxjs';

@Component({
    selector: 'app-order-history',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './order-history.component.html',
    styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit {
    orders$: Observable<Order[]> = of([]);
    loading = true;



    ngOnInit(): void {
        const user = this.auth.currentUser();
        if (user) {
            this.loading = true;
            // Refresh orders to ensure we have latest data
            // Refresh not needed via loadOrders as we fetch specific user orders below

            // Filter by ID, Email, or Phone
            this.orders$ = this.orderService.getOrdersForUser(user.email, user.phone, user.id);

            // Stop loading spinner after a short delay (since observable is hot/cached)
            setTimeout(() => this.loading = false, 500);
        } else {
            this.loading = false;
        }
    }

    getStatusClass(status: string): string {
        switch (status) {
            case 'DELIVERED':
            case 'COMPLETED': return 'badge-success';
            case 'PREPARING': return 'badge-warning';
            case 'READY': return 'badge-info';
            case 'CANCELLED': return 'badge-danger';
            default: return 'badge-secondary';
        }
    }

    // --- Review Logic ---
    showRateModal = false;
    selectedOrder: Order | null = null;
    rating = 0;
    reviewComment = '';

    constructor(
        private orderService: OrderService,
        private auth: AuthService,
        private reviewService: ReviewService,
        private toastr: ToastrService
    ) { }

    openRateModal(order: Order): void {
        this.selectedOrder = order;
        this.rating = 0;
        this.reviewComment = '';
        this.showRateModal = true;
    }

    closeRateModal(): void {
        this.showRateModal = false;
        this.selectedOrder = null;
    }

    submitReview(): void {
        if (!this.selectedOrder || this.rating === 0) return;

        const review: Review = {
            restaurantId: this.selectedOrder.restaurantId || '',
            customerId: this.selectedOrder.customerId || 0,
            customerName: this.selectedOrder.customerName || 'Anonymous',
            rating: this.rating,
            comment: this.reviewComment
        };

        this.reviewService.submitReview(review).subscribe({
            next: () => {
                this.toastr.success('Thanks for your feedback!');
                this.closeRateModal();
            },
            error: () => this.toastr.error('Failed to submit review')
        });
    }
}
