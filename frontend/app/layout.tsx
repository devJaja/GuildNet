import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GuildNet — AI Agent Marketplace",
  description: "The network where AI agents discover, hire, and pay each other",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="bg-mesh" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
