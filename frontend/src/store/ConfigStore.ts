import { proxy } from 'valtio';

/**
 * Types
 */
export interface IConfigStore {
    config: Record<string, any>;
    isLoading: boolean;
    error: string | null;
}

/**
 * State
 */
const state = proxy<IConfigStore>({
    config: {},
    isLoading: false,
    error: null,
});

/**
 * Store / Actions
 */
const ConfigStore = {
    state,

    setConfig(config: Record<string, any>) {
        state.config = config;
    },

    setLoading(isLoading: boolean) {
        state.isLoading = isLoading;
    },

    setError(error: string | null) {
        state.error = error;
    },

    // Process config message directly from websocket
    processConfigMessage(message: any) {
        try {
            console.log('Processing config message:', JSON.stringify(message));
            if (message?.res && Array.isArray(message.res) && message.res.length >= 3 && message.res[1] === 'config') {
                // Extract the first item from the config array, which contains the actual config object
                const configData = Array.isArray(message.res[2]) && message.res[2].length > 0 ? message.res[2][0] : {};
                console.log('Extracted config data:', JSON.stringify(configData));
                this.setConfig(configData);
                return true;
            }
            return false;
        } catch (error) {
            this.setError(error instanceof Error ? error.message : 'Failed to process config message');
            return false;
        }
    },

    // Call this after user receives success from websocket
    async fetchConfig(wsRequests: any) {
        try {
            this.setLoading(true);
            this.setError(null);

            const result = await wsRequests.sendRequest('GetConfig', []);

            if (result) {
                this.setConfig(result as Record<string, any>);
            }
        } catch (error) {
            this.setError(error instanceof Error ? error.message : 'Failed to fetch config');
        } finally {
            this.setLoading(false);
        }
    },
};

export default ConfigStore;
