import { urlBase64ToUint8Array } from './urlBase64ToUint8Array';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;

interface NotificationOptions {
    title: string;
    body: string;
    vibrate?: number[];
    url?: string;
}

export class NotificationService {
    private static instance: NotificationService;
    private swRegistration: ServiceWorkerRegistration | null = null;
    private subscription: PushSubscription | null = null;

    private constructor() {
        this.init();
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            });

            this.swRegistration = registration;

            // Get existing subscription if any
            this.subscription = await registration.pushManager.getSubscription();

            if (!this.subscription) {
                await this.subscribe();
            }
        } catch (error) {
            console.error('Service worker registration failed:', error);
        }
    }

    private async subscribe() {
        if (!this.swRegistration) {
            console.error('Service worker not registered');
            return;
        }

        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID public key is not defined');
            return;
        }

        try {
            const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

            this.subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            console.log('Push notification subscription successful:', this.subscription);
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
        }
    }

    async showNotification({ title, body, url }: NotificationOptions) {
        // First check if we can use the Push API
        if (this.subscription && this.swRegistration) {
            // Create notification through service worker
            await this.swRegistration.showNotification(title, {
                body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                data: { url: url || '/' },
            });
        } else if ('Notification' in window) {
            // Fallback to regular Notifications API
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body,
                    icon: '/icons/icon-192x192.png',
                });
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();

                if (permission === 'granted') {
                    new Notification(title, {
                        body,
                        icon: '/icons/icon-192x192.png',
                    });
                }
            }
        }
    }
}
