'use client';

import { Sidebar } from '@/components/Sidebar';
import { SidebarProps } from '@/components/Sidebar/types';
import classNames from 'classnames';
import React, { FC, memo } from 'react';

export interface LayoutProps {
    /**
     * Sidebar content
     * all props which was declared
     * inside sidebar component
     */
    sidebarProps?: SidebarProps;
    /**
     * Application code
     */
    children?: React.ReactNode;
    /**
     * Container class name
     */
    containerClassName?: string;
    /**
     * Custom footer component
     */
    customFooter?: React.ReactNode;
    /**
     * Custom header component
     */
    customHeader: React.ReactNode | null;
    /**
     * Main class name
     */
    mainClassName?: string;
    /**
     * Main and Header container classname
     */
    wrapperClassname?: string;
}

const LayoutComponent: FC<LayoutProps> = ({
    sidebarProps,
    children,
    containerClassName,
    customFooter,
    customHeader,
    mainClassName = 'flex-1 flex flex-col relative overflow-y-auto focus:outline-none',
    wrapperClassname = 'flex flex-col w-0 flex-1',
}: LayoutProps) => {
    return (
        <div className="flex h-full">
            <Sidebar {...sidebarProps} />
            <div className={wrapperClassname}>
                {customHeader}
                <main className={mainClassName}>
                    <div className={classNames('flex-grow', containerClassName)}>{children}</div>
                    {customFooter}
                </main>
            </div>
        </div>
    );
};

export const Layout = memo(LayoutComponent);
