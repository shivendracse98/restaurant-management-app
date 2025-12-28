import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from 'src/app/core/services/order.service';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
    selector: 'app-order-tracking',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './order-tracking.component.html',
    styleUrls: ['./order-tracking.component.scss']
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
    orderId: string | null = null;
    order: any = null;
    loading = true;
    private pollSub: Subscription | null = null;

    // Status milestones
    private milestones = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

    constructor(
        private route: ActivatedRoute,
        private orderService: OrderService
    ) { }

    ngOnInit(): void {
        this.orderId = this.route.snapshot.paramMap.get('id');
        if (this.orderId) {
            this.loadOrder();
            this.startPolling();
        }
    }

    loadOrder(): void {
        if (!this.orderId) return;
        this.orderService.getOrder(Number(this.orderId)).subscribe({
            next: (data: any) => {
                this.order = data;
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Failed to load order', err);
                this.loading = false;
            }
        });
    }

    startPolling(): void {
        // Poll every 30 seconds to check for status updates
        this.pollSub = interval(30000)
            .pipe(switchMap(() => this.orderService.getOrder(Number(this.orderId!))))
            .subscribe((data: any) => {
                this.order = data;
            });
    }

    isStepActive(step: string): boolean {
        if (!this.order) return false;
        if (this.order.status === 'CANCELLED') return false;

        const currentIndex = this.milestones.indexOf(this.order.status);
        const stepIndex = this.milestones.indexOf(step);

        // If order has passed this step, it is active
        return currentIndex >= stepIndex;
    }

    ngOnDestroy(): void {
        if (this.pollSub) this.pollSub.unsubscribe();
    }
}
