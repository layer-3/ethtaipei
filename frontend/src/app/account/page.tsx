'use client';

import dynamic from 'next/dynamic';

const AccountInterface = dynamic(
    () => import('@/components/account/AccountInterface').then((mod) => mod.AccountInterface),
    { ssr: false },
);
const LayoutWidget = dynamic(() => import('@/widgets/LayoutWidget').then((mod) => mod.LayoutWidget), { ssr: true });

export default function AccountPage() {
    return (
        <div className="min-h-screen">
            <LayoutWidget>
                <main className="h-full relative bg-main-background-color flex flex-col pb-40">
                    <AccountInterface />
                </main>
            </LayoutWidget>
        </div>
    );
}
