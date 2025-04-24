import { NitroliteRPC } from '@erc7824/nitrolite';
import { Channel } from '@/types';
import { WebSocketConnection } from './connection';
import { WalletSigner } from '../crypto';
import MessageService from '../services/MessageService';

/**
 * Handles WebSocket requests with NitroliteRPC
 */
export class WSRequests {
    constructor(
        private connection: WebSocketConnection,
        private signer: WalletSigner,
    ) {}

    /**
     * Sends a request to the server
     */
    async sendRequest(method: string, params: unknown[] = []): Promise<unknown> {
        if (!this.connection.isConnected) {
            const errorMsg = 'WebSocket not connected';

            MessageService.error(errorMsg);
            throw new Error(errorMsg);
        }

        MessageService.system(`Sending request: ${method}`);
        return this.sendSignedRequest(NitroliteRPC.createRequest(method, params));
    }

    /**
     * Subscribes to a channel
     */
    async subscribe(channel: Channel | string): Promise<void> {
        if (!this.connection.isConnected) {
            const errorMsg = 'WebSocket not connected';

            MessageService.error(errorMsg);
            throw new Error(errorMsg);
        }

        MessageService.system(`Subscribing to channel: ${channel}`);

        // Convert Nitrolite Channel to string if needed
        const channelString = typeof channel === 'string' ? channel : String(channel);
        const request = NitroliteRPC.createRequest('subscribe', [channelString]);

        await this.sendSignedRequest(request);
        if (
            typeof channel === 'string' &&
            (channel === 'public' || channel === 'game' || channel === 'trade' || channel === 'private')
        ) {
            this.connection.setCurrentChannel(channel as Channel);
        }
    }

    /**
     * Publishes a message to the specified channel
     */
    async publishMessage(message: string, channelOverride?: Channel): Promise<void> {
        if (!this.connection.isConnected) {
            const errorMsg = 'WebSocket not connected';

            MessageService.error(errorMsg);
            throw new Error(errorMsg);
        }

        const channel = channelOverride || this.connection.currentSubscribedChannel;

        if (!channel) {
            const errorMsg = 'No channel specified and not subscribed to any channel';

            MessageService.error(errorMsg);
            throw new Error(errorMsg);
        }

        const shortenedKey = this.connection.getShortenedPublicKey();

        MessageService.sent(message, shortenedKey);

        const request = NitroliteRPC.createRequest('publish', [channel, message, shortenedKey]);

        await this.sendRequestDirect(await NitroliteRPC.signMessage(request, this.signer.sign));
    }

    /**
     * Sends a ping request to the server
     */
    async ping(): Promise<unknown> {
        MessageService.system('Sending ping request');
        return this.sendSignedRequest(NitroliteRPC.createRequest('ping', []));
    }

    /**
     * Sends multiple requests in batch
     */
    async sendBatch(requests: { method: string; params: unknown[] }[]): Promise<unknown[]> {
        MessageService.system(`Sending batch of ${requests.length} requests`);
        return Promise.all(requests.map((req) => this.sendRequest(req.method, req.params)));
    }

    /**
     * Helper method to sign and send a request
     */
    private async sendSignedRequest(request: unknown): Promise<unknown> {
        try {
            const signedRequest = await NitroliteRPC.signMessage(request, this.signer.sign);

            return this.sendRequestDirect(signedRequest);
        } catch (error) {
            const errorMsg = `Signing request failed: ${error instanceof Error ? error.message : String(error)}`;

            MessageService.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    /**
     * Helper method to send a pre-constructed request
     */
    private async sendRequestDirect(signedRequest: unknown): Promise<unknown> {
        if (!this.connection.isConnected || !this.connection.webSocket) {
            const errorMsg = 'WebSocket not connected';

            MessageService.error(errorMsg);
            throw new Error(errorMsg);
        }

        const pendingRequests = this.connection.getPendingRequests();
        const timeout = this.connection.getRequestTimeout();
        const ws = this.connection.webSocket;

        return new Promise((resolve, reject) => {
            // Safely check format of signedRequest
            if (
                typeof signedRequest !== 'object' ||
                !signedRequest ||
                !('req' in signedRequest) ||
                !Array.isArray(signedRequest.req) ||
                signedRequest.req.length === 0 ||
                typeof signedRequest.req[0] !== 'number'
            ) {
                throw new Error('Invalid request format');
            }

            const requestId = signedRequest.req[0];
            const method =
                Array.isArray(signedRequest.req) && signedRequest.req.length > 1
                    ? String(signedRequest.req[1])
                    : 'unknown';

            const requestTimeout = setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                    pendingRequests.delete(requestId);
                    const timeoutMsg = `Request timeout: ${method}`;

                    MessageService.error(timeoutMsg);
                    reject(new Error(timeoutMsg));
                }
            }, timeout);

            pendingRequests.set(requestId, {
                resolve: (result: unknown) => {
                    clearTimeout(requestTimeout);
                    resolve(result);
                },
                reject: (error: Error) => {
                    clearTimeout(requestTimeout);
                    reject(error);
                },
            });

            try {
                ws.send(JSON.stringify(signedRequest));
            } catch (error) {
                clearTimeout(requestTimeout);
                pendingRequests.delete(requestId);

                const errorMsg = `Failed to send message: ${error instanceof Error ? error.message : String(error)}`;

                MessageService.error(errorMsg);
                reject(new Error(errorMsg));
            }
        });
    }
}
