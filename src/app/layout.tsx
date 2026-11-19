import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matriz — Torre de Operações & Gestão de Missões",
  description: "Plataforma Aeronáutica de Gestão de Missões, Checklists de Voo e Métricas de Esquadrão.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-navy-50 text-navy-900 antialiased">
        {children}
      </body>
    </html>
  );
}
