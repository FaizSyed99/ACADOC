import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "AcaDoc AI - Medical Education Assistant",
  description: "Grounded, textbook-aligned medical AI for students and professionals.",
};

import AuthProvider from "@/components/providers/SessionProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased bg-surface-cream text-surface-on-surface min-h-screen">
        <AuthProvider>
          {/* Subtle Medical Grid Background */}
          <div className="fixed inset-0 z-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }} />
          <div className="relative z-10">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
