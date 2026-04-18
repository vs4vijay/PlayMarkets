import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "APL - Agentic Premier League",
  description: "Connect with fans around shared team loyalties and match experiences",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#38003c] text-white">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00ff85] rounded-lg flex items-center justify-center text-[#38003c] font-black text-xl">
                A
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">APL</h1>
                <p className="text-xs text-[#00ff85]">Agentic Premier League</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-6 text-sm font-medium">
              <a href="/" className="hover:text-[#00ff85] transition-colors">Matches</a>
              <a href="#predictions" className="hover:text-[#00ff85] transition-colors">Predictions</a>
              <a href="#teams" className="hover:text-[#00ff85] transition-colors">Teams</a>
              <a href="#profile" className="px-4 py-2 bg-[#00ff85] text-[#38003c] rounded-lg font-bold hover:bg-white transition-colors">
                Sign In
              </a>
            </nav>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="font-bold text-[#38003c]">APL</span>
                <span>·</span>
                <span>Agentic Premier League</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <a href="#" className="hover:text-zinc-600">About</a>
                <a href="#" className="hover:text-zinc-600">Privacy</a>
                <a href="#" className="hover:text-zinc-600">Terms</a>
                <span>© 2026</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}