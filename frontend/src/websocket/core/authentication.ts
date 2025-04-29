import { createAuthRequestMessage, createAuthVerifyMessage } from '@erc7824/nitrolite'; // Added createAuthVerifyMessage
import { WalletSigner } from '../crypto';

/**
 * Authenticates with the WebSocket server using a challenge-response flow.
 *
 * @param ws - The WebSocket connection
 * @param signer - The signer to use for authentication
 * @param timeout - Timeout in milliseconds for the entire process
 * @returns A Promise that resolves when authenticated
 */
export async function authenticate(ws: WebSocket, signer: WalletSigner, timeout: number): Promise<void> {
    if (!ws) throw new Error('WebSocket not connected');

    const authRequest = await createAuthRequestMessage(signer.sign, signer.address);

    console.log('Sending authRequest:', signer);
    ws.send(authRequest);

    return new Promise((resolve, reject) => {
        if (!ws) return reject(new Error('WebSocket not connected'));

        let authTimeoutId: NodeJS.Timeout | null = null;

        const cleanup = () => {
            if (authTimeoutId) {
                clearTimeout(authTimeoutId);
                authTimeoutId = null;
            }
            ws.removeEventListener('message', handleAuthResponse);
        };

        const resetTimeout = () => {
            if (authTimeoutId) {
                clearTimeout(authTimeoutId);
            }
            authTimeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Authentication timeout'));
            }, timeout);
        };

        const handleAuthResponse = async (event: MessageEvent) => {
            let response;

            try {
                response = JSON.parse(event.data);
                console.log('Received auth message:', response);
            } catch (error) {
                console.error('Error parsing auth response:', error);
                console.log('Raw auth message:', event.data);
                // Don't reject yet, maybe the next message is valid
                return;
            }

            try {
                // Check for challenge response: [<id>, "auth_challenge", [{challenge_message: "..."}], <ts>]
                if (response.res && response.res[1] === 'auth_challenge') {
                    console.log('Received auth_challenge, preparing auth_verify...');
                    resetTimeout(); // Reset timeout while we process and send verify

                    // 2. Create and send verification message
                    const authVerify = await createAuthVerifyMessage(
                        signer.sign,
                        event.data, // Pass the raw challenge response string/object
                        signer.address,
                    );

                    console.log('Sending authVerify:', authVerify);
                    ws.send(authVerify);
                    // Keep listening for the final success/error
                }
                // Check for success response: [<id>, "auth", ...] or { type: "auth_verify" }
                else if (response.res && response.res[1] === 'auth_verify') {
                    console.log('Authentication successful');
                    cleanup();
                    resolve();
                }
                // Check for error response: [<id>, ...] or { type: "error" }
                else if (response.err && response.err[1] === 'error') {
                    const errorMsg = response.err ? response.err[1] : response.error || 'Authentication failed';

                    console.error('Authentication failed:', errorMsg);
                    cleanup();
                    reject(new Error(String(errorMsg)));
                } else {
                    console.warn('Received unexpected auth message structure:', response);
                    // Keep listening if it wasn't a final success/error
                }
            } catch (error) {
                console.error('Error handling auth response:', error);
                cleanup();
                reject(new Error(`Authentication error: ${error instanceof Error ? error.message : String(error)}`));
            }
        };

        ws.addEventListener('message', handleAuthResponse);
        resetTimeout(); // Start the initial timeout
    });
}
