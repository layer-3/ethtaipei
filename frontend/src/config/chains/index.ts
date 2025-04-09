import { defineChain } from 'viem';
import {
    base,
    bsc,
    gnosis,
    linea,
    lineaSepolia,
    mainnet,
    optimism,
    polygonMumbai,
    scroll,
    arbitrum,
    sepolia,
    avalanche,
    localhost,
    polygonAmoy,
    celo,
} from 'viem/chains';

const polygon = defineChain({
    id: 137,
    name: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
        default: {
            http: ['https://polygon-rpc.com'],
        },
        public: {
            http: ['https://polygon-rpc.com', 'https://rpc-mainnet.matic.network', 'https://polygon.llamarpc.com'],
        },
    },
    blockExplorers: {
        default: {
            name: 'PolygonScan',
            url: 'https://polygonscan.com',
            apiUrl: 'https://api.polygonscan.com/api',
        },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 25770160,
        },
    },
});

// Get supported chains from env or use defaults
const envSupportedChains =
    process.env.NEXT_PUBLIC_SUPPORTED_CHAINS?.split(',')
        .map((chain) => {
            const sanitizedChain = chain.trim().replace(/^\"|\"$/g, '');
            const number = Number(sanitizedChain);

            return !isNaN(number) && number !== 0 ? number : null;
        })
        .filter((chain): chain is number => chain !== null) ?? [];

// Always include Polygon (137) as a supported chain
const supportedChains = Array.from(new Set([137, ...envSupportedChains]));

const chainsArray = [
    mainnet,
    defineChain({ ...bsc, rpcUrls: { default: { http: ['https://bsc.drpc.org'] } } }), // default rpcUrls for sepolia are not working
    defineChain({ ...sepolia, rpcUrls: { default: { http: ['https://sepolia.gateway.tenderly.co'] } } }),
    base,
    arbitrum,
    avalanche,
    polygon,
    polygonMumbai,
    optimism,
    gnosis,
    linea,
    lineaSepolia,
    scroll,
    localhost,
    polygonAmoy,
    celo,
];

export const chains = chainsArray.filter((chain) => supportedChains.includes(chain.id));

export const chainImageURLById = (id?: number) => {
    switch (id) {
        case 1:
        case 11155111:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png';
        case 137:
        case 80002:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/3890.png';
        case 59144:
        case 59141:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/27657.png';
        case 8453:
            return 'https://assets.coingecko.com/asset_platforms/images/131/standard/base-network.png?1720533039';
        case 56:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png';
        case 100:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/1659.png';
        case 10:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/11840.png';
        case 534352:
            return 'https://assets.coingecko.com/asset_platforms/images/153/standard/scroll.jpeg?1706606782';
        case 42161:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/11841.png';
        case 42220:
            return 'https://s2.coinmarketcap.com/static/img/coins/64x64/5567.png';
        default:
            return null;
    }
};
