import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MC Treino – Campbell Consultoria Fitness",
  description: "Sistema de acompanhamento de treinos da Campbell Consultoria Fitness",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MC Treino",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#64A1EE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="antialiased bg-background text-secondary">
        {children}
      </body>
    </html>
  );
}
