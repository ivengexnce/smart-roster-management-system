import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Roster Management System - Datastraw Assessment',
  description: 'Deterministic constraint-based workforce scheduling for multi-brand operations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 font-sans min-h-screen antialiased select-auto">
        {children}
      </body>
    </html>
  );
}
