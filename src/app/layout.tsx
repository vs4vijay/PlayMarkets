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
  title: "CricPulse — India's Cricket Fan Zone",
  description: "Live cricket scores, fan reactions, and match predictions for IPL and Indian cricket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#070d1a] flex flex-col">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 bg-[#070d1a]/95 backdrop-blur-md border-b border-[#1e2d45]">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg"
                style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}>
                🏏
              </div>
              <div>
                <span className="font-black text-lg tracking-tight">
                  <span className="text-[#FF7722]">Cric</span>
                  <span className="text-white">Pulse</span>
                </span>
                <p className="text-[10px] text-zinc-500 -mt-0.5">India's Cricket Fan Zone</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1 text-sm font-medium">
              <a href="/" className="px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#1e2d45] rounded-lg transition-colors hidden sm:block">
                Matches
              </a>
              <a href="#predictions" className="px-3 py-1.5 text-zinc-300 hover:text-white hover:bg-[#1e2d45] rounded-lg transition-colors hidden sm:block">
                Predict
              </a>
              <a
                href="#"
                className="px-4 py-2 rounded-lg font-bold text-sm text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: '#003791' }}
              >
                Sign In
              </a>
            </nav>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <main className="flex-1">
          {children}
        </main>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="border-t border-[#1e2d45] bg-[#070d1a]">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-black text-base">
                  <span className="text-[#FF7722]">Cric</span>
                  <span className="text-white">Pulse</span>
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 text-sm">India's Cricket Fan Zone</span>
              </div>
              <div className="flex items-center gap-5 text-sm text-zinc-600">
                <a href="#" className="hover:text-zinc-400 transition-colors">About</a>
                <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
                <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
                <span>© 2026</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
