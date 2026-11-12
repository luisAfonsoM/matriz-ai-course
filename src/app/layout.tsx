import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Matriz — Gestão de Projetos e Equipas",
  description: "Plataforma de Gestão de Projetos, Tarefas em Kanban e Métricas de Progresso.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
