import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/UserProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PlayMarkets — The Social Prediction Layer for Live Sports",
  description: "Live sports scores, fan reactions, and social predictions — predict, react, and compete in real-time",
  icons: {
    icon:     '/favicon.svg',
    shortcut: '/favicon.svg',
    apple:    '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem('pm_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`
        }} />
      </head>
      <body className="min-h-screen bg-background flex flex-col">
        <ThemeProvider>
          <UserProvider>
            <Header />

            <main className="flex-1">
              {children}
            </main>

            <footer className="border-t border-rim bg-background">
              <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base">
                      <span className="text-accent">Play</span>
                      <span className="text-white">Markets</span>
                    </span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500 text-sm">The Social Prediction Layer for Live Sports</span>
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
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
