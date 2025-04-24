'use client';

import { AccountInterface } from '@/components/account/AccountInterface';

export default function AccountPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="min-h-screen bg-white flex flex-col pb-40">
                <AccountInterface />
            </main>
        </div>
    );
}
