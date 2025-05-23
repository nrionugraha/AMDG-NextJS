import '../styles/style.css';
import { ReactNode } from 'react';
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';

export const metadata: Metadata = {
    title: {
        template :  '%s | AMDG Social',
        default: 'AMDG Social',
    },
    description: 'A decentralized social media platform built with blockchain technology.',
    icons: {
        icon: '/icon.ico',
    },
  };

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en"suppressHydrationWarning={true} >
            <body>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>  
    );
}