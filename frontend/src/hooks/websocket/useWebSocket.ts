import { useWebSocketContext } from '@/context/WebSocketContext'; // Import the context hook

/**
 * Custom hook to manage WebSocket connection and operations using WebSocketContext.
 * This hook no longer takes a URL parameter as it's managed by the provider.
 */
export function useWebSocket() {
    const context = useWebSocketContext();

    return {
        status: context.status,
        keyPair: context.keyPair,
        wsChannel: context.wsChannel,
        currentNitroliteChannel: context.currentNitroliteChannel,

        isConnected: context.isConnected,
        hasKeys: context.hasKeys,

        generateKeys: context.generateKeys,
        connect: context.connect,
        disconnect: context.disconnect,
        setNitroliteChannel: context.setNitroliteChannel,
        clearKeys: context.clearKeys,
        subscribeToChannel: context.subscribeToChannel,
        sendMessage: context.sendMessage,
        sendPing: context.sendPing,
        sendRequest: context.sendRequest,
    };
}
