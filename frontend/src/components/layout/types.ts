import { HeaderProps } from '@/components/Header';

export interface HeaderNavigations {
    name: string | React.ReactNode;
    href: string;
}

export interface HeaderOptions {
    navigations?: HeaderNavigations[];
    customHeaderContent?: React.ReactNode;
    responseIsMobile?: boolean;
}

export interface LayoutProps {
    className?: string;
    headerOptions?: HeaderOptions;
    hideFooter?: boolean;
    hideHeader?: boolean;
    isVaultLayout?: boolean;
    vaultHeaderProps?: HeaderProps;
}
