import { Chain } from 'viem';
import { chains } from '@/config/chains';
import { proxy } from 'valtio';
import { SettingsState } from './types';

/**
 * Settings Store
 *
 * Manages user settings and preferences.
 * Responsible for:
 * - Chain selection preferences
 * - Testnet visibility
 * - Persisting settings to localStorage
 */

const defaultChain = () => {
    // Always default to Polygon (137) unless explicitly set in localStorage
    const chainId =
        typeof localStorage !== 'undefined' && Number(localStorage.getItem('chainId'))
            ? Number(localStorage.getItem('chainId'))
            : 137;

    const chain = chains.find((chain) => chain.id === chainId);

    // If chain not found or not supported, default to Polygon
    if (!chain) {
        return chains.find((chain) => chain.id === 137) || chains[0];
    }

    return chain;
};

/**
 * State
 */
const state = proxy<SettingsState>({
    testnets: typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem('testnets')) : true,
    activeChain: defaultChain(),
    prevChainId: defaultChain()?.id ?? 0,
});

/**
 * Store / Actions
 */
const SettingsStore = {
    state,

    /**
     * Set active blockchain
     */
    setActiveChain(value: Chain | undefined) {
        state.activeChain = value;
        localStorage.setItem('chainId', value ? value.id.toString() : '');
    },

    /**
     * Set previous chain ID
     */
    setPrevChainId(value: number | undefined) {
        state.prevChainId = value ?? 0;
    },

    /**
     * Toggle testnet visibility
     */
    toggleTestNets() {
        state.testnets = !state.testnets;
        if (state.testnets) {
            localStorage.setItem('testnets', 'true');
        } else {
            localStorage.removeItem('testnets');
        }
    },

    /**
     * Get supported chains based on testnet setting
     */
    getSupportedChains(): Chain[] {
        if (state.testnets) {
            return chains;
        }
        return chains.filter((chain) => !chain.testnet);
    },

    /**
     * Get chain by ID
     */
    getChainById(chainId: number): Chain | undefined {
        return chains.find((chain) => chain.id === chainId);
    },

    /**
     * Get chain display name
     */
    getChainName(chainId: number | undefined): string {
        if (!chainId) return 'Unknown Network';
        const chain = this.getChainById(chainId);

        return chain ? chain.name : 'Unknown Network';
    },
};

export default SettingsStore;
