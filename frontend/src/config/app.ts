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
        URL: 'https://ethtaipei-production.up.railway.app/ws',
    },

    // Channel configuration
    CHANNEL: {
        // Default address for the second participant
        DEFAULT_GUEST: '0xd4D81A4e51F3b43ff181aDC50cfD7b20A0638F99',
        GUEST_KEY: '0xad1610e1e750ec26ed6a039d9661a965fd21a9e19e54076c84940400c75f6bbf',
        // Challenge period in seconds (1 day)
        CHALLENGE_PERIOD: 86400,
        MAGIC_NUMBER_OPEN: BigInt(7877),
        MAGIC_NUMBER_CLOSE: BigInt(7879),
    },

    TOKENS: {
        1337: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as Address,
        80002: '0xf9b497837cbBA86A8Dd800B9DDC5076fEbECFa83' as Address,
    },

    CUSTODIES: {
        1337: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE' as Address,
        80002: '0x65a995DFe6C14f604d91987A94054df990F88BBa' as Address,
    },
    ADJUDICATORS: {
        flag: {
            1337: '0x5fbdb2315678afecb367f032d93f642f64180aa3' as Address,
            80002: '0xE6586454A7fc0F74E8870263148014FEEAEAAe52' as Address,
        },
    },
};

export const DEFAULT_ADDRESS = 'TST';

export default APP_CONFIG;
