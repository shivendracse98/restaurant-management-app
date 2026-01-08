import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Added form module
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReviewService, Review } from '../../../core/services/review.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ToastrService } from 'ngx-toastr';
import { Order } from '../../../models/order.model';
import { Observable, of, Subscription } from 'rxjs';

@Component({
    selector: 'app-order-history',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './order-history.component.html',
    styleUrls: ['./order-history.component.scss']
})
export class OrderHistoryComponent implements OnInit, OnDestroy {
    orders: Order[] = []; // Changed from Observable to local array for mutable updates
    loading = true;
    private wsSub: Subscription | null = null;
    private activeSubscriptions: Set<string> = new Set(); // Track restaurant topics

    // --- Review Logic ---
    showRateModal = false;
    selectedOrder: Order | null = null;
    rating = 0;
    hoverRating = 0; // For star hover effect
    reviewComment = '';

    constructor(
        private orderService: OrderService,
        private auth: AuthService,
        private reviewService: ReviewService,
        private toastr: ToastrService,
        private webSocketService: WebSocketService
    ) { }

    ngOnInit(): void {
        const user = this.auth.currentUser();
        if (user) {
            this.loading = true;
            // Fetch initial list; treating getOrdersForUser as returning Observable
            this.orderService.getOrdersForUser(user.email, user.phone, user.id)?.subscribe({
                next: (data) => {
                    this.orders = data || [];
                    this.loading = false;
                    this.setupRealtimeTracking(user.id);
                },
                error: () => this.loading = false
            });
        } else {
            this.loading = false;
        }
    }

    ngOnDestroy(): void {
        if (this.wsSub) this.wsSub.unsubscribe();
        this.webSocketService.disconnect();
    }

    setupRealtimeTracking(currentUserId: number | undefined): void {
        if (!currentUserId) return;

        // 1. Identify active orders (not DELIVERED/CANCELLED) to know which restaurants to listen to
        const activeOrders = this.orders.filter(o =>
            o.status !== 'DELIVERED' &&
            o.status !== 'CANCELLED' &&
            o.status !== 'COMPLETED' &&
            o.restaurantId // Ensure restaurantId exists
        );

        if (activeOrders.length === 0) return; // No active orders, no need to listen

        // 2. Connect
        this.webSocketService.connect();

        // 3. Subscribe to each unique restaurant topic
        activeOrders.forEach(order => {
            const topic = '/topic/restaurant/' + order.restaurantId;
            if (!this.activeSubscriptions.has(topic)) {
                this.activeSubscriptions.add(topic);

                this.webSocketService.subscribe(topic).subscribe((payload: any) => {
                    if (payload && payload.customerId === currentUserId) {
                        this.handleUpdate(payload);
                    }
                });
            }
        });
    }

    handleUpdate(payload: any): void {
        const index = this.orders.findIndex(o => o.id === payload.id);

        // Map Backend DTO -> Frontend Model
        const updatedOrder: Order = {
            ...payload,
            items: (payload.items || []).map((i: any) => ({
                menuItemId: i.menuItemId,
                qty: i.quantity || i.qty,
                name: i.itemName || i.name,
                price: i.pricePerUnit || i.price,
                status: i.status
            }))
        };

        if (index !== -1) {
            // Update existing order in list
            this.orders[index] = { ...this.orders[index], ...updatedOrder };
            this.toastr.info(`Order #${updatedOrder.id}: Status is now ${updatedOrder.status}`, 'Update');
        } else {
            // New order? Maybe add it to top
            this.orders.unshift(updatedOrder);
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

    getRatingLabel(rating: number): string {
        switch (rating) {
            case 1: return 'Terrible 😠';
            case 2: return 'Bad 😞';
            case 3: return 'Okay 😐';
            case 4: return 'Good 🙂';
            case 5: return 'Excellent! 🤩';
            default: return 'Select a rating';
        }
    }
}
