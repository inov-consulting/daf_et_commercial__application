import type { Metadata } from 'next';
import { fontVariables } from '@/lib/fonts';
import '@/styles/globals.css';
import ClientLayout from './clientLayout';

export const metadata: Metadata = {
  title: 'DAF & Commercial | INOV Consulting',
  description: 'Application web DAF et commercial – INOV Consulting',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html data-theme="light" className={fontVariables}>
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}