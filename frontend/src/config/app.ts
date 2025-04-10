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
        DEFAULT_GUEST: '0xD278d56eDe7F43992739C1ee95806D00fDeA5aa0',
        GUEST_KEY: '0xad1610e1e750ec26ed6a039d9661a965fd21a9e19e54076c84940400c75f6bbf',
        // Challenge period in seconds (1 day)
        CHALLENGE_PERIOD: 1,
        MAGIC_NUMBER_OPEN: BigInt(7877),
        MAGIC_NUMBER_CLOSE: BigInt(7879),
    },

    TOKENS: {
        137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as Address,
        42220: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as Address,
        1337: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' as Address,
        80002: '0xf9b497837cbBA86A8Dd800B9DDC5076fEbECFa83' as Address,
    },

    CUSTODIES: {
        137: '0xDB33fEC4e2994a675133320867a6439Da4A5acD8' as Address,
        42220: '0xDB33fEC4e2994a675133320867a6439Da4A5acD8' as Address,
        1337: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE' as Address,
        80002: '0x65a995DFe6C14f604d91987A94054df990F88BBa' as Address,
    },

    DEFAULT_ADJUDICATOR: 'dummy',

    ADJUDICATORS: {
        dummy: {
            137: '0xC2BA5c5E2c4848F64187Aa1F3f32a331b0C031b9' as Address,
            42220: '0xC2BA5c5E2c4848F64187Aa1F3f32a331b0C031b9' as Address,
            1337: '0x5fbdb2315678afecb367f032d93f642f64180aa3' as Address,
            80002: '0xE6586454A7fc0F74E8870263148014FEEAEAAe52' as Address,
        },
    },
};

export const DEFAULT_ADDRESS = 'TST';

export default APP_CONFIG;
