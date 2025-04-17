import type { Metadata } from 'next';
import { Poppins, Geist_Mono } from 'next/font/google';
import './globals.css';
import MiniKitProvider from '@/providers/minikit';

const poppins = Poppins({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin'],
    variable: '--font-poppins',
    display: 'swap',
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

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
    return (
        <html lang="en">
            <body className={`${poppins.variable} ${geistMono.variable} antialiased`}>
                <MiniKitProvider>{children}</MiniKitProvider>
            </body>
        </html>
    );
}
