import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { OrderService } from 'src/app/core/services/order.service';
import { GuestSessionService } from 'src/app/core/services/guest-session.service';
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
    private milestones = ['PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

    isGuest = false;

    constructor(
        private route: ActivatedRoute,
        private orderService: OrderService,
        private guestSessionService: GuestSessionService
    ) { }

    ngOnInit(): void {
        this.checkIfGuest();
        this.orderId = this.route.snapshot.paramMap.get('id');
        if (this.orderId) {
            this.loadOrder();
            this.startPolling();
        }
    }

    checkIfGuest(): void {
        const guestKey = this.guestSessionService.getValidGuestKey();
        this.isGuest = !!guestKey;
    }

    loadOrder(): void {
        const guestKey = this.guestSessionService.getValidGuestKey();
        let request$;

        if (guestKey) {
            const sessionId = this.guestSessionService.getValidOrderId();
            if (sessionId && String(sessionId) === String(this.orderId)) {
                request$ = this.orderService.trackGuestOrder(guestKey);
            } else {
                request$ = this.orderService.getOrder(Number(this.orderId));
            }
        } else {
            if (!this.orderId) return;
            request$ = this.orderService.getOrder(Number(this.orderId));
        }

        request$.subscribe({
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
        this.pollSub = interval(15000)
            .pipe(
                switchMap(() => {
                    const guestKey = this.guestSessionService.getValidGuestKey();
                    const sessionId = this.guestSessionService.getValidOrderId();

                    if (guestKey && sessionId && String(sessionId) === String(this.orderId)) {
                        return this.orderService.trackGuestOrder(guestKey);
                    }
                    return this.orderService.getOrder(Number(this.orderId!));
                })
            )
            .subscribe((data: any) => {
                this.order = data;
            });
    }

    isStepActive(step: string): boolean {
        if (!this.order) return false;
        if (this.order.status === 'CANCELLED') return false;
        const currentIndex = this.milestones.indexOf(this.order.status);
        const stepIndex = this.milestones.indexOf(step);
        return currentIndex >= stepIndex;
    }

    ngOnDestroy(): void {
        if (this.pollSub) this.pollSub.unsubscribe();
    }
}
