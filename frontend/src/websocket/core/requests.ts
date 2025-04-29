import { createPingMessage, NitroliteRPCMessage } from '@erc7824/nitrolite';
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
     * Helper method to send a pre-signed, stringified request message.
     * Handles request tracking and timeouts.
     */
    async sendRequest(signedRequest: string): Promise<unknown> {
        // Parameter is now string
        if (!this.connection.isConnected || !this.connection.webSocket) {
            const errorMsg = 'WebSocket not connected';

            MessageService.error(errorMsg);
            throw new Error(errorMsg);
        }

        const pendingRequests = this.connection.getPendingRequests();
        const timeout = this.connection.getRequestTimeout();
        const ws = this.connection.webSocket;

        let requestId: number;
        let method: string = 'unknown';

        try {
            // Parse the stringified JSON to extract request ID and method
            const parsedRequest: NitroliteRPCMessage = JSON.parse(signedRequest);

            if (
                !parsedRequest ||
                !parsedRequest.req ||
                !Array.isArray(parsedRequest.req) ||
                parsedRequest.req.length < 2 || // Need at least ID and method
                typeof parsedRequest.req[0] !== 'number' ||
                typeof parsedRequest.req[1] !== 'string'
            ) {
                throw new Error('Invalid request format in signed message string');
            }
            requestId = parsedRequest.req[0];
            method = parsedRequest.req[1];
        } catch (parseError) {
            const errorMsg = `Failed to parse signed request string: ${parseError instanceof Error ? parseError.message : String(parseError)}`;

            MessageService.error(errorMsg);
            console.error('Invalid request string:', signedRequest); // Log the problematic string
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const requestTimeout = setTimeout(() => {
                if (pendingRequests.has(requestId)) {
                    pendingRequests.delete(requestId);
                    const timeoutMsg = `Request timeout: ${method} (ID: ${requestId})`;

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
                ws.send(signedRequest);
            } catch (error) {
                clearTimeout(requestTimeout);
                pendingRequests.delete(requestId);
                const errorMsg = `Failed to send message: ${error instanceof Error ? error.message : String(error)}`;

                MessageService.error(errorMsg);
                reject(new Error(errorMsg));
            }
        });
    }

    /**
     * Sends a ping request to the server
     */
    async ping(): Promise<unknown> {
        MessageService.system('Sending ping request');

        return this.sendRequest(await createPingMessage(this.signer.sign));
    }
}
