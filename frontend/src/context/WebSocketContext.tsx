import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import {
    createWebSocketClient,
    createEthersSigner,
    generateKeyPair,
    WalletSigner,
    CryptoKeypair,
    getAddressFromPublicKey,
    WebSocketClient,
} from '@/websocket';
import { Channel as NitroliteChannel } from '@erc7824/nitrolite';
import { Channel, WSStatus } from '@/types';
import APP_CONFIG from '@/config/app';
import { NitroliteStore } from '@/store';

const CRYPTO_KEYPAIR_KEY = 'crypto_keypair';
const WS_URL = APP_CONFIG.WEBSOCKET.URL;

interface WebSocketContextProps {
    client: WebSocketClient | null;
    status: WSStatus;
    keyPair: CryptoKeypair | null;
    wsChannel: Channel | null;
    currentNitroliteChannel: NitroliteChannel | null;
    isConnected: boolean;
    hasKeys: boolean;
    generateKeys: () => Promise<CryptoKeypair | null>;
    connect: () => Promise<boolean>;
    disconnect: () => void;
    setNitroliteChannel: (channel: NitroliteChannel) => void;
    clearKeys: () => void;
    sendPing: () => Promise<void>;
    sendRequest: (payload: string) => Promise<unknown>;
}

const WebSocketContext = createContext<WebSocketContextProps | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [status, setStatus] = useState<WSStatus>('disconnected');
    const [keyPair, setKeyPair] = useState<CryptoKeypair | null>(null);
    const [currentSigner, setCurrentSigner] = useState<WalletSigner | null>(null);
    const [wsChannel, setWsChannel] = useState<Channel | null>(null);
    const [currentNitroliteChannel, setCurrentNitroliteChannel] = useState<NitroliteChannel | null>(null);
    const clientRef = useRef<WebSocketClient | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedKeys = localStorage.getItem(CRYPTO_KEYPAIR_KEY);

            if (savedKeys) {
                try {
                    const parsed = JSON.parse(savedKeys) as CryptoKeypair;

                    if (parsed.publicKey && !parsed.address) {
                        parsed.address = getAddressFromPublicKey(parsed.publicKey);
                        localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(parsed));
                    }
                    setKeyPair(parsed);
                } catch (e) {
                    console.error('Failed to parse saved keys:', e);
                    localStorage.removeItem(CRYPTO_KEYPAIR_KEY);
                }
            } else {
                console.log('No saved keys found in localStorage.');
            }
        }
    }, []);

    const generateKeys = useCallback(async () => {
        try {
            if (typeof window !== 'undefined') {
                const savedKeys = localStorage.getItem(CRYPTO_KEYPAIR_KEY);

                if (savedKeys) {
                    try {
                        const parsed = JSON.parse(savedKeys) as CryptoKeypair;

                        if (parsed && typeof parsed.privateKey === 'string' && typeof parsed.publicKey === 'string') {
                            if (parsed.publicKey && !parsed.address) {
                                parsed.address = getAddressFromPublicKey(parsed.publicKey);
                                localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(parsed));
                            }
                            setKeyPair(parsed);
                            const signer = createEthersSigner(parsed.privateKey);

                            setCurrentSigner(signer);
                            NitroliteStore.setStateSigner(signer);
                            return parsed;
                        }
                    } catch (e) {
                        // Could not parse, fall through and generate keys.
                        console.error('Failed to parse saved keys during generateKeys:', e);
                        localStorage.removeItem(CRYPTO_KEYPAIR_KEY);
                    }
                }
            }
            // If no valid keys in storage, generate new ones.
            const newKeyPair = await generateKeyPair();

            setKeyPair(newKeyPair);
            if (typeof window !== 'undefined') {
                localStorage.setItem(CRYPTO_KEYPAIR_KEY, JSON.stringify(newKeyPair));
            }
            const newSigner = createEthersSigner(newKeyPair.privateKey);

            setCurrentSigner(newSigner);
            NitroliteStore.setStateSigner(newSigner);
            return newKeyPair;
        } catch (error) {
            const errorMsg = `Error generating keys: ${error instanceof Error ? error.message : String(error)}`;

            console.error(errorMsg);
            return null;
        }
    }, []);

    const clearKeys = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(CRYPTO_KEYPAIR_KEY);
        }
        setKeyPair(null);
        setCurrentSigner(null);
        NitroliteStore.setStateSigner(null);
        if (clientRef.current?.isConnected) {
            clientRef.current.close();
        }
    }, []);

    useEffect(() => {
        if (keyPair?.privateKey && !currentSigner) {
            try {
                const signer = createEthersSigner(keyPair.privateKey);

                setCurrentSigner(signer);
                NitroliteStore.setStateSigner(signer);
            } catch (e) {
                console.error('Failed to create signer from saved keys:', e);
            }
        }
    }, [keyPair, currentSigner]);

    useEffect(() => {
        if (currentSigner && !clientRef.current) {
            const newClient = createWebSocketClient(WS_URL, currentSigner, {
                autoReconnect: true,
                reconnectDelay: 1000,
                maxReconnectAttempts: 5,
                requestTimeout: 10000,
            });

            clientRef.current = newClient;

            newClient.onStatusChange((newStatus) => {
                setStatus(newStatus);
                if (newStatus === 'connected') {
                    setWsChannel(newClient.currentSubscribedChannel);
                    setCurrentNitroliteChannel(newClient.currentNitroliteChannel);
                } else if (newStatus === 'disconnected' || newStatus === 'reconnect_failed') {
                    setWsChannel(null);
                    setCurrentNitroliteChannel(null);
                }
            });

            newClient.onError((error) => {
                console.error(`WebSocket error: ${error.message}`);
            });

            newClient.onMessage((message) => {
                const hasType = (msg: unknown): msg is { type: unknown } =>
                    typeof msg === 'object' && msg !== null && 'type' in msg;
                const messageType = hasType(message)
                    ? typeof message.type === 'string'
                        ? message.type
                        : String(message.type)
                    : 'unknown';

                console.log(`Received message (type: ${messageType})`);
            });

            // Automatically attempt to connect once client is initialized
            connect();
        }

        return () => {
            if (clientRef.current) {
                clientRef.current.close();
                clientRef.current = null;
                setStatus('disconnected');
                setWsChannel(null);
                setCurrentNitroliteChannel(null);
            }
        };
    }, [currentSigner]);

    const connect = useCallback(async () => {
        if (!clientRef.current) {
            console.error('Cannot connect: WebSocket client not initialized (no signer?).');
            return false;
        }
        if (clientRef.current.isConnected) {
            return true;
        }
        try {
            await clientRef.current.connect();
            return true;
        } catch (error) {
            const errorMsg = `Connection error: ${error instanceof Error ? error.message : String(error)}`;

            console.error(errorMsg);
            return false;
        }
    }, []);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.close();
        } else {
            console.error('Cannot disconnect: WebSocket client not initialized.');
        }
    }, []);

    const setNitroliteChannel = useCallback((nitroliteChannel: NitroliteChannel) => {
        if (!clientRef.current) {
            console.error('Cannot set Nitrolite channel: Client not initialized.');
            return;
        }
        setCurrentNitroliteChannel(nitroliteChannel);
        clientRef.current.setNitroliteChannel(nitroliteChannel);
    }, []);

    const sendPing = useCallback(async () => {
        if (!clientRef.current?.isConnected) {
            console.error('Cannot ping: Not connected.');
            return;
        }
        try {
            await clientRef.current.ping();
        } catch (error) {
            console.error(`Ping error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }, []);

    const sendRequest = useCallback(async (signedRequest) => {
        if (!clientRef.current?.isConnected) {
            const errorMsg = `Cannot send request (${signedRequest}): Not connected.`;

            console.error(errorMsg);
            throw new Error('WebSocket not connected');
        }
        try {
            const response = await clientRef.current.sendRequest(signedRequest);

            return response;
        } catch (error) {
            console.error(
                `Request error (${signedRequest}): ${error instanceof Error ? error.message : String(error)}`,
            );
            throw error;
        }
    }, []);

    const value = useMemo(
        () => ({
            client: clientRef.current,
            status,
            keyPair,
            wsChannel,
            currentNitroliteChannel,
            isConnected: status === 'connected',
            hasKeys: !!keyPair,
            generateKeys,
            connect,
            disconnect,
            setNitroliteChannel,
            clearKeys,
            sendPing,
            sendRequest,
        }),
        [
            status,
            keyPair,
            wsChannel,
            currentNitroliteChannel,
            generateKeys,
            connect,
            disconnect,
            setNitroliteChannel,
            clearKeys,
            sendPing,
            sendRequest,
        ],
    );

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocketContext = (): WebSocketContextProps => {
    const context = useContext(WebSocketContext);

    if (context === undefined) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
};
