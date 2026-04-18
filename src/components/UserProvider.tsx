'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
}

interface UserContextValue {
  user: AppUser | null;
  /** Called by the modal when the user submits a name */
  setUsername: (name: string) => void;
  signOut: () => void;
  openModal: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const UserContext = createContext<UserContextValue | null>(null);

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const STORAGE_KEY_NAME = 'pm_username';
const STORAGE_KEY_ID   = 'pm_user_id';

// ── Username modal ────────────────────────────────────────────────────────────

function UsernameModal({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError]  = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Small delay so the animation has started before focusing
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const validate = (v: string) => {
    if (v.length < 2)  return 'At least 2 characters';
    if (v.length > 20) return 'Max 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Only letters, numbers and underscores';
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const err = validate(trimmed);
    if (err) { setError(err); return; }
    onSubmit(trimmed);
  };

  return (
    /* Full-screen backdrop */
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#070d1a]/80 backdrop-blur-md px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-[#1e2d45] bg-[#0e1628] shadow-2xl shadow-black/60 p-8"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
          >
            🎯
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-black text-center text-white mb-1">
          Welcome to{' '}
          <span className="text-[#FF7722]">Play</span>
          <span className="text-white">Markets</span>
        </h2>
        <p className="text-sm text-zinc-400 text-center mb-8">
          Pick a username and start predicting
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">
                @
              </span>
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => { setValue(e.target.value); setError(''); }}
                placeholder="your_username"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#1e2d45] border border-[#2d3d55] text-white placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-[#FF7722] focus:ring-1 focus:ring-[#FF7722]/40 transition-colors"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-400 pl-1">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={value.trim().length < 2}
            className="w-full py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #003791 0%, #FF7722 100%)' }}
          >
            Let&apos;s Play →
          </button>
        </form>

        <p className="mt-5 text-[10px] text-zinc-600 text-center">
          No password needed — just a name to play
        </p>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AppUser | null>(null);
  const [showModal, setModal]   = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const name = localStorage.getItem(STORAGE_KEY_NAME);
    const id   = localStorage.getItem(STORAGE_KEY_ID);
    if (name && id) {
      setUser({ id, name });
    } else {
      setModal(true); // First visit — show modal immediately
    }
    setHydrated(true);
  }, []);

  const setUsername = useCallback((name: string) => {
    let id = localStorage.getItem(STORAGE_KEY_ID);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY_ID, id);
    }
    localStorage.setItem(STORAGE_KEY_NAME, name);
    setUser({ id, name });
    setModal(false);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_NAME);
    localStorage.removeItem(STORAGE_KEY_ID);
    setUser(null);
    setModal(true);
  }, []);

  const openModal = useCallback(() => setModal(true), []);

  // Don't render children until we know hydration state (prevents flash)
  if (!hydrated) return null;

  return (
    <UserContext.Provider value={{ user, setUsername, signOut, openModal }}>
      {children}
      {showModal && <UsernameModal onSubmit={setUsername} />}
    </UserContext.Provider>
  );
}
