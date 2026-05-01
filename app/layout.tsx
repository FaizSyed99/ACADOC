import type { Metadata } from "next";
import { Inter, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "AcaDoc AI - Medical Education Assistant",
  description: "Grounded, textbook-aligned medical AI for students and professionals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="font-manrope antialiased bg-slate-950 text-slate-50 min-h-screen">
        {/* Organic Background Blobs */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-container opacity-20 blur-[100px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#089a9b] opacity-10 blur-[120px]" />
          <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-[#089a9b] opacity-5 blur-[80px]" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
