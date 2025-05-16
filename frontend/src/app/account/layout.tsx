import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Clearnet',
    description:
        'Clearnet is a decentralized application platform that allows users to list their own state-channel applications.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
