import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'ServiceOS — Sua operação. Em um só lugar.', template: '%s · ServiceOS' },
  description: 'Gestão para empresas prestadoras de serviços.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
