import { proxy } from 'valtio';

export type AppName = 'yuzux' | 'snake' | 'ping-pong';

interface AppState {
    openApp: AppName | null;
    minimizedApps: Set<AppName>;
    isFullscreen: boolean;
    isDepositOpen: boolean;
    isSendOpen: boolean;
    isReceiveOpen: boolean;
    isCloseChannelOpen: boolean;
    isWithdrawOpen: boolean;
}

const state = proxy<AppState>({
    openApp: null,
    minimizedApps: new Set(),
    isFullscreen: false,
    isDepositOpen: false,
    isSendOpen: false,
    isReceiveOpen: false,
    isCloseChannelOpen: false,
    isWithdrawOpen: false,
});

const AppStore = {
    state,

    openApp(appName: AppName) {
        state.openApp = appName;
        state.minimizedApps.delete(appName);
        state.isFullscreen = true;
    },

    closeApp() {
        state.openApp = null;
        state.isFullscreen = false;
    },

    minimizeApp(appName: AppName) {
        if (state.openApp === appName) {
            state.openApp = null;
            state.minimizedApps.add(appName);
            state.isFullscreen = false;
        }
    },

    maximizeApp(appName: AppName) {
        state.openApp = appName;
        state.minimizedApps.delete(appName);
        state.isFullscreen = true;
    },

    isAppMinimized(appName: AppName): boolean {
        return state.minimizedApps.has(appName);
    },

    getOpenApp(): AppName | null {
        return state.openApp;
    },

    getMinimizedApps(): AppName[] {
        return Array.from(state.minimizedApps);
    },

    openDeposit() {
        state.isDepositOpen = true;
    },

    closeDeposit() {
        state.isDepositOpen = false;
    },

    openSend() {
        state.isSendOpen = true;
    },

    closeSend() {
        state.isSendOpen = false;
    },

    openReceive() {
        state.isReceiveOpen = true;
    },

    closeReceive() {
        state.isReceiveOpen = false;
    },

    openCloseChannel() {
        state.isCloseChannelOpen = true;
    },

    closeCloseChannel() {
        state.isCloseChannelOpen = false;
    },

    openWithdraw() {
        state.isWithdrawOpen = true;
    },

    closeWithdraw() {
        state.isWithdrawOpen = false;
    },
};

export default AppStore;
