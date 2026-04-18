'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from './UserProvider';
import { useTheme, THEMES } from './ThemeProvider';
import { LogoIcon } from './Logo';
import { STARTING_BALANCE } from '@/types';

export function Header() {
  const { user, signOut, openModal } = useUser();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const balanceColor =
    !user ? ''
    : user.balance > STARTING_BALANCE ? 'text-positive'
    : user.balance < STARTING_BALANCE ? 'text-red-400'
    : 'text-zinc-300';

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-rim">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="group-hover:scale-105 transition-transform shrink-0">
            <LogoIcon size={36} className="rounded-xl overflow-hidden" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">
              <span className="text-accent">Play</span>
              <span className="text-white">Markets</span>
            </span>
            <p className="text-[10px] text-zinc-500 -mt-0.5 hidden sm:block">
              The Social Prediction Layer for Live Sports
            </p>
          </div>
        </a>

        {/* Right side */}
        <nav className="flex items-center gap-1 text-sm font-medium">
          <a
            href="/"
            className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-rim rounded-lg transition-colors hidden sm:block"
          >
            Matches
          </a>
          <a
            href="/leaderboard"
            className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-rim rounded-lg transition-colors hidden sm:block"
          >
            Leaderboard
          </a>
          <a
            href="/rules"
            className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-rim rounded-lg transition-colors hidden sm:block"
          >
            Rules
          </a>

          {user ? (
            /* Signed-in: balance chip + avatar + dropdown */
            <div ref={dropdownRef} className="relative flex items-center gap-2">
              {/* Balance chip */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rim border border-rim-hi">
                <span className="text-[10px] text-zinc-500">bal</span>
                <span className={`text-xs font-black ${balanceColor}`}>
                  {user.balance.toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-600">pts</span>
              </div>

              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-rim hover:bg-rim-hi transition-colors"
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs uppercase"
                  style={{ background: 'linear-gradient(135deg, var(--pm-brand) 0%, var(--pm-accent) 100%)' }}
                >
                  {user.name.slice(0, 1)}
                </div>
                <span className="text-sm font-semibold text-white max-w-[100px] truncate">
                  {user.name}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-rim bg-surface shadow-xl overflow-hidden z-50">
                  <div className="px-3 py-2.5 border-b border-rim">
                    <p className="text-[10px] text-zinc-500">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">@{user.name}</p>
                  </div>
                  {/* Balance row in dropdown (visible on mobile) */}
                  <div className="px-3 py-2 border-b border-rim flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Balance</span>
                    <span className={`text-sm font-black ${balanceColor}`}>
                      {user.balance.toLocaleString()} pts
                    </span>
                  </div>
                  {/* Theme picker */}
                  <div className="px-3 py-2.5 border-b border-rim">
                    <p className="text-[10px] text-zinc-500 mb-2">Theme</p>
                    <div className="flex gap-2">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTheme(t.id)}
                          title={t.name}
                          className={`w-7 h-7 rounded-full transition-all ${
                            theme === t.id
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-surface scale-110'
                              : 'opacity-60 hover:opacity-100 hover:scale-110'
                          }`}
                          style={{ background: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)` }}
                        />
                      ))}
                    </div>
                  </div>
                  <a
                    href="/rules"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-rim transition-colors flex items-center gap-2"
                  >
                    <span>📋</span> Scoring Rules
                  </a>
                  <button
                    onClick={() => { setDropdownOpen(false); signOut(); }}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-rim transition-colors flex items-center gap-2"
                  >
                    <span>↩</span> Change username
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Not signed in: theme picker + join button */
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex gap-1.5">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    title={t.name}
                    className={`w-5 h-5 rounded-full transition-all ${
                      theme === t.id
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-background scale-110'
                        : 'opacity-50 hover:opacity-90 hover:scale-110'
                    }`}
                    style={{ background: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)` }}
                  />
                ))}
              </div>
              <button
                onClick={openModal}
                className="px-4 py-2 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, var(--pm-brand) 0%, var(--pm-accent) 100%)' }}
              >
                Join
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
