import { Injectable } from '@angular/core';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root',
})
export class WebSocketService {
    private client: Client | null = null;
    private connectionStatus$ = new BehaviorSubject<boolean>(false);
    private messageSubject = new Subject<{ topic: string; payload: any }>();

    constructor(private configService: ConfigService) { }

    /**
     * Connect to the WebSocket endpoint
     */
    public connect(): void {
        if (this.client && this.client.active) {
            console.log('WebSocket already connected');
            return;
        }

        // Context Path fix: If apiBaseUrl ends in /api, it's likely the context path.
        // We should NOT strip it. The endpoint is at /api/ws
        const socketUrl = `${this.configService.getApiBaseUrl()}/ws`;

        this.client = new Client({
            webSocketFactory: () => new SockJS(socketUrl),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            debug: (str) => {
                console.log(str);
            },
        });

        this.client.onConnect = (frame) => {
            console.log('Connected to WebSocket');
            this.connectionStatus$.next(true);
        };

        this.client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        this.client.onWebSocketClose = () => {
            console.log('WebSocket connection closed');
            this.connectionStatus$.next(false);
        };

        this.client.activate();
    }

    /**
     * Subscribe to a specific topic
     */
    public subscribe(topic: string): Observable<any> {
        return new Observable((observer) => {
            // WaitForConnection logic
            const subscription = this.connectionStatus$
                .pipe(filter((isConnected) => isConnected))
                .subscribe(() => {
                    if (!this.client) return;

                    this.client.subscribe(topic, (message: Message) => {
                        try {
                            const payload = JSON.parse(message.body);
                            observer.next(payload);
                        } catch (e) {
                            console.error('Failed to parse message', e);
                        }
                    });
                });

            return () => {
                subscription.unsubscribe();
                // Note: STOMP subscription removal isn't explicitly handled here 
                // because we want persistent simplified logic, but can be added if needed.
            };
        });
    }

    /**
     * Disconnect the client
     */
    public disconnect(): void {
        if (this.client) {
            this.client.deactivate();
            this.client = null;
            this.connectionStatus$.next(false);
        }
    }

    public isConnected(): Observable<boolean> {
        return this.connectionStatus$.asObservable();
    }
}
