import { Chain } from 'viem';
import { chains } from '@/config/chains';
import { proxy } from 'valtio';

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
 * Types
 */
export interface ISettingsStore {
    testnets: boolean;
    activeChain: Chain | undefined;
    prevChainId: number;
}

/**
 * State
 */
const state = proxy<ISettingsStore>({
    testnets: typeof localStorage !== 'undefined' ? Boolean(localStorage.getItem('testnets')) : true,
    activeChain: defaultChain(),
    prevChainId: defaultChain()?.id ?? 0,
});

/**
 * Store / Actions
 */
const SettingsStore = {
    state,

    setActiveChain(value: Chain | undefined) {
        state.activeChain = value;
        localStorage.setItem('chainId', value ? value.id.toString() : '');
    },

    setPrevChainId(value: number | undefined) {
        state.prevChainId = value ?? 0;
    },

    toggleTestNets() {
        state.testnets = !state.testnets;
        if (state.testnets) {
            localStorage.setItem('testnets', 'true');
        } else {
            localStorage.removeItem('testnets');
        }
    },
};

export default SettingsStore;
