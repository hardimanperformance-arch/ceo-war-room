import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CEO War Room | Top Brands',
  description: 'Real-time dashboard for Top Brands portfolio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
