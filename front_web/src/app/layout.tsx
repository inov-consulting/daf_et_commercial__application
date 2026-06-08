import type { Metadata } from 'next';
import '@/styles/globals.css';
import ClientLayout from './clientLayout';

export const metadata: Metadata = {
  title: 'DAF & Commercial | INOV Consulting',
  description: 'Application web DAF et commercial – INOV Consulting',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClientLayout>{children}</ClientLayout>;
}