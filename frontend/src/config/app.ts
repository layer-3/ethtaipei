import { Address } from 'viem';

/**
 * Application configuration
 *
 * This file contains configuration settings for the application,
 * including network endpoints and default values.
 */
export const APP_CONFIG = {
    // WebSocket configuration for real-time communication
    WEBSOCKET: {
        URL: 'ws://localhost:8000/ws',
    },

    // Channel configuration
    CHANNEL: {
        // Default address for the second participant
        DEFAULT_GUEST: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        GUEST_KEY: '0xd4D81A4e51F3b43ff181aDC50cfD7b20A0638F99',
        // Challenge period in seconds (1 day)
        CHALLENGE_PERIOD: 86400,
        MAGIC_NUMBER_OPEN: BigInt(7877),
        MAGIC_NUMBER_CLOSE: BigInt(7879),
    },

    CUSTODIES: {
        80002: '0x65a995DFe6C14f604d91987A94054df990F88BBa' as Address,
    },

    ADJUDICATORS: {
        flag: '0xE6586454A7fc0F74E8870263148014FEEAEAAe52' as Address,
    },
};

export default APP_CONFIG;
