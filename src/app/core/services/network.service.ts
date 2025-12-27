
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge, of, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NetworkService implements OnDestroy {
    private online$ = new BehaviorSubject<boolean>(navigator.onLine);
    private subscription: Subscription = new Subscription();

    constructor() {
        this.initConnectivityMonitoring();
    }

    private initConnectivityMonitoring() {
        // Listen to window events
        const onlineEvent$ = fromEvent(window, 'online').pipe(map(() => true));
        const offlineEvent$ = fromEvent(window, 'offline').pipe(map(() => false));

        this.subscription.add(
            merge(onlineEvent$, offlineEvent$).subscribe(isOnline => {
                this.online$.next(isOnline);
                console.log('📡 Network Status Changed:', isOnline ? 'ONLINE' : 'OFFLINE');
            })
        );
    }

    /**
     * Returns observable of online status
     */
    get isOnline$(): Observable<boolean> {
        return this.online$.asObservable();
    }

    /**
     * Returns current snapshot of online status
     */
    get isOnline(): boolean {
        return this.online$.value;
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
