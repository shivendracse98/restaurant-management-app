
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class OfflineService {
    private dbName = 'TasteTownDB';
    private dbVersion = 1;
    private db: IDBDatabase | null = null;

    constructor() {
        this.initDB();
    }

    private initDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event);
                reject();
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                // Create store for offline orders
                if (!db.objectStoreNames.contains('orders')) {
                    db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }

    private async ensureDB(): Promise<IDBDatabase> {
        if (!this.db) {
            await this.initDB();
        }
        return this.db!;
    }

    async saveOrder(order: any): Promise<void> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['orders'], 'readwrite');
            const store = transaction.objectStore('orders');
            // Ensure we mark it as pending sync if not already
            order.offlineStatus = 'PENDING_SYNC';
            const request = store.add(order);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getPendingOrders(): Promise<any[]> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['orders'], 'readonly');
            const store = transaction.objectStore('orders');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async clearProcessedOrders(ids: number[]): Promise<void> {
        const db = await this.ensureDB();
        const transaction = db.transaction(['orders'], 'readwrite');
        const store = transaction.objectStore('orders');

        ids.forEach(id => store.delete(id));

        return new Promise((resolve) => {
            transaction.oncomplete = () => resolve();
        });
    }
}
