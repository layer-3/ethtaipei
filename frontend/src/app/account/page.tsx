'use client';

import dynamic from 'next/dynamic';

const AccountInterface = dynamic(
    () => import('@/components/account/AccountInterface').then((mod) => mod.AccountInterface),
    { ssr: false },
);

export default function AccountPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="min-h-screen bg-white flex flex-col pb-40">
                <AccountInterface />
            </main>
        </div>
    );
}
