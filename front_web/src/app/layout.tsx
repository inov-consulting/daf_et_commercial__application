import type { Metadata } from 'next';
import { fontVariables } from '@/lib/fonts';
import '@/styles/globals.css';
import { ReduxProvider } from '@/redux/features/provider';

export const metadata: Metadata = {
  title: 'DAF & Commercial | INOV Consulting',
  description: 'Application web DAF et commercial – INOV Consulting',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html data-theme="light" className={fontVariables}>
      <body className="antialiased">
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
