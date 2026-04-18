'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from './UserProvider';

export function Header() {
  const { user, signOut, openModal } = useUser();
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

  return (
    <header className="sticky top-0 z-50 bg-[#070d1a]/95 backdrop-blur-md border-b border-[#1e2d45]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-lg group-hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
          >
            🎯
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">
              <span className="text-[#FF7722]">Play</span>
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
            className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-[#1e2d45] rounded-lg transition-colors hidden sm:block"
          >
            Matches
          </a>
          <a
            href="/leaderboard"
            className="px-3 py-1.5 text-zinc-400 hover:text-white hover:bg-[#1e2d45] rounded-lg transition-colors hidden sm:block"
          >
            Leaderboard
          </a>

          {user ? (
            /* Signed-in: avatar + dropdown */
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-xl bg-[#1e2d45] hover:bg-[#2d3d55] transition-colors"
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs uppercase"
                  style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
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
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[#1e2d45] bg-[#0e1628] shadow-xl overflow-hidden z-50">
                  <div className="px-3 py-2.5 border-b border-[#1e2d45]">
                    <p className="text-[10px] text-zinc-500">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">@{user.name}</p>
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); signOut(); }}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-400 hover:text-white hover:bg-[#1e2d45] transition-colors flex items-center gap-2"
                  >
                    <span>↩</span> Change username
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Not signed in */
            <button
              onClick={openModal}
              className="px-4 py-2 rounded-lg font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
            >
              Join
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
