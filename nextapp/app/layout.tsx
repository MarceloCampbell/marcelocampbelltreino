import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MC Treino – Campbell Consultoria Fitness",
  description: "Sistema de acompanhamento de treinos da Campbell Consultoria Fitness",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-background text-secondary">
        {children}
      </body>
    </html>
  );
}
