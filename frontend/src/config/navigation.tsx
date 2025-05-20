import { CircleStarIcon } from '@/assets/images/CircleStarIcon';
import { VaultSidebarIcons } from '@/assets/images/VaultSidebarIcons';
import { SidebarIcons } from '@/assets/images/SidebarIcons';

const navigationElements = {
    home: {
        name: 'Home',
        fallback: 'Home',
        path: 'https://yellow.com/',
        defaultIcon: <SidebarIcons name="home" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <SidebarIcons name="home" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    assets: {
        name: 'Assets',
        fallback: 'Rankings',
        path: 'https://yellow.com/assets',
        defaultIcon: <SidebarIcons name="assets" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <SidebarIcons name="assets" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    news: {
        name: 'News',
        fallback: 'News',
        path: 'https://yellow.com/news',
        defaultIcon: <SidebarIcons name="news" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <SidebarIcons name="news" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    trade: {
        name: 'Trade',
        fallback: 'Trade',
        path: 'https://terminal.yellow.com',
        activeIcon: <SidebarIcons name="trading" primaryColor="var(--navbar-control-layer-color-60)" />,
        defaultIcon: <SidebarIcons name="trading" primaryColor="var(--neutral-control-layer-color-40)" />,
        newTab: true,
    },
    settings: {
        name: 'Settings',
        fallback: 'Settings',
        path: 'https://yellow.com/settings',
        activeIcon: <SidebarIcons name="settings" primaryColor="var(--navbar-control-layer-color-60)" />,
        defaultIcon: <SidebarIcons name="settings" primaryColor="var(--neutral-control-layer-color-40)" />,
        bottom: true,
    },
    win: {
        name: 'Win',
        fallback: 'Win!',
        path: 'https://yellow.com/win',
        activeIcon: <SidebarIcons name="ticket" primaryColor="var(--navbar-control-layer-color-60)" />,
        defaultIcon: <SidebarIcons name="ticket" primaryColor="var(--neutral-control-layer-color-40)" />,
        newTab: false,
    },
    wallet: {
        name: 'Vault',
        fallback: 'Vault',
        path: 'https://yellow.com/vault',
        activeIcon: <SidebarIcons name="wallet" primaryColor="var(--navbar-control-layer-color-60)" />,
        defaultIcon: <SidebarIcons name="wallet" primaryColor="var(--neutral-control-layer-color-40)" />,
        newTab: false,
    },
    dashboard: {
        name: 'Dashboard',
        fallback: 'Dashboard',
        path: 'https://yellow.com/vault',
        defaultIcon: <VaultSidebarIcons name="dashboard" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="dashboard" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    seasons: {
        name: 'Seasons',
        fallback: 'Seasons',
        path: 'https://yellow.com/seasons',
        defaultIcon: <CircleStarIcon className="w-[22px] h-[22px]" fillColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <CircleStarIcon className="w-[22px] h-[22px]" fillColor="var(--navbar-control-layer-color-60)" />,
    },
    apps: {
        name: 'Apps',
        fallback: 'Apps',
        path: 'https://yellow.com/applications',
        defaultIcon: <VaultSidebarIcons name="applications" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="applications" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    quests: {
        name: 'Quests',
        fallback: 'Quests',
        path: 'https://yellow.com/quests',
        defaultIcon: <VaultSidebarIcons name="assets" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="assets" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    leagues: {
        name: 'Leagues',
        fallback: 'Leagues',
        path: 'https://yellow.com/leaderboard',
        defaultIcon: <VaultSidebarIcons name="leaderboard" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="leaderboard" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    vaultSettings: {
        name: 'Vault Settings',
        fallback: 'Vault Settings',
        path: 'https://yellow.com/vault-/settings',
        defaultIcon: <VaultSidebarIcons name="settings" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="settings" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    faq: {
        name: 'FAQ',
        fallback: 'FAQ',
        path: 'https://yellow.com/seasons#/FAQ',
        defaultIcon: <VaultSidebarIcons name="FAQ" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="FAQ" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    learn: {
        name: 'Learn',
        fallback: 'Learn',
        path: 'https://yellow.com/learn',
        defaultIcon: <VaultSidebarIcons name="learn" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="learn" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
    research: {
        name: 'Research',
        fallback: 'Research',
        path: 'https://yellow.com/research',
        defaultIcon: <VaultSidebarIcons name="research" primaryColor="var(--neutral-control-layer-color-40)" />,
        activeIcon: <VaultSidebarIcons name="research" primaryColor="var(--navbar-control-layer-color-60)" />,
    },
};

export const navigationLoggedin = [navigationElements['trade'], navigationElements['wallet']];

export const navigation = [navigationElements['settings']];

export const navigationMobile = [
    navigationElements['home'],
    navigationElements['news'],
    navigationElements['wallet'],
    navigationElements['seasons'],
];

export const navigationYellow = [
    navigationElements['home'],
    navigationElements['news'],
    navigationElements['learn'],
    navigationElements['research'],
];

export const navigationVault = [
    navigationElements['win'],
    navigationElements['wallet'],
    navigationElements['seasons'],
    navigationElements['leagues'],
];

export const navigationPro = [navigationElements['assets']];
