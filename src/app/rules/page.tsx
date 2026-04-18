// Rules page — static, no data fetching needed.

import {
  SCORING_RULES,
  SCORE_TOLERANCES,
  MULTIPLIER_RULES,
  STARTING_BALANCE,
} from '@/lib/scoring';
import { PREDICTION_STAKE } from '@/types';

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-[#070d1a] text-white">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#003791]/30 via-[#070d1a]/80 to-[#070d1a] px-4 py-12 md:py-16">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-1/3 w-72 h-72 bg-[#FF7722] rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/3 w-48 h-48 bg-[#003791] rounded-full blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">
            Scoring Rules
          </h1>
          <p className="text-zinc-400 text-base">
            How predictions are scored and how your balance grows (or shrinks).
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 pb-16 space-y-8">
        {/* ── Starting balance ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-[#FF7722]/30 bg-gradient-to-br from-[#FF7722]/10 to-[#0e1628] p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🎁</span>
            <h2 className="text-xl font-black text-white">Starting Balance</h2>
          </div>
          <p className="text-zinc-300 text-sm leading-relaxed">
            Every new player receives{' '}
            <span className="font-black text-[#FF7722]">{STARTING_BALANCE} pts</span>{' '}
            when they join. Each prediction costs a{' '}
            <span className="font-black text-[#FF7722]">{PREDICTION_STAKE} pt stake</span>{' '}
            upfront — your balance drops immediately when you commit.
            Win the stake back plus bonuses for correct calls; lose it for wrong ones.
          </p>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            <div className="rounded-xl bg-[#0e1628] border border-[#1e2d45] p-3">
              <p className="text-2xl font-black text-[#FF7722]">{STARTING_BALANCE}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Starting pts</p>
            </div>
            <div className="rounded-xl bg-[#0e1628] border border-[#1e2d45] p-3">
              <p className="text-2xl font-black text-red-400">−{PREDICTION_STAKE}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Stake per bet</p>
            </div>
            <div className="rounded-xl bg-[#0e1628] border border-[#1e2d45] p-3">
              <p className="text-2xl font-black text-[#00D4B4]">+30</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Max net win</p>
            </div>
            <div className="rounded-xl bg-[#0e1628] border border-[#1e2d45] p-3">
              <p className="text-2xl font-black text-red-400">−{PREDICTION_STAKE}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Max loss</p>
            </div>
          </div>
        </section>

        {/* ── Points breakdown ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <span>⚡</span> Points Breakdown
          </h2>
          <div className="rounded-2xl border border-[#1e2d45] overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2.5 bg-[#0e1628] border-b border-[#1e2d45] text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Condition</span>
              <span className="text-right">Points</span>
            </div>
            {SCORING_RULES.map((rule, i) => (
              <div
                key={i}
                className={`px-4 py-3 grid grid-cols-[1fr_auto] gap-x-4 items-start ${
                  i % 2 === 1 ? 'bg-[#0e1628]/50' : ''
                }`}
              >
                <div>
                  <p className="text-sm text-white font-medium">{rule.condition}</p>
                  {rule.note && (
                    <p className="text-[11px] text-zinc-500 mt-0.5">{rule.note}</p>
                  )}
                </div>
                <span
                  className={`text-sm font-black shrink-0 ${
                    rule.points.startsWith('+')
                      ? 'text-[#00D4B4]'
                      : rule.points.startsWith('−') || rule.points.startsWith('-')
                      ? 'text-red-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {rule.points}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500 text-center">
            Maximum per prediction (correct winner + both scores): <strong className="text-white">+20 pts</strong>.
            With early-prediction bonus applied: up to <strong className="text-[#00D4B4]">+30 pts</strong>.
          </p>
        </section>

        {/* ── Score tolerances ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <span>🎯</span> Score Tolerances by Format
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Your predicted runs are compared against the actual innings total.
            The tolerance window varies by match format — ODI and Test are harder
            to predict exactly, so they get a wider window.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SCORE_TOLERANCES.map((t) => (
              <div
                key={t.format}
                className="rounded-xl bg-[#0e1628] border border-[#1e2d45] p-4 text-center"
              >
                <p className="text-sm font-black text-[#FF7722] mb-1">{t.format}</p>
                <p className="text-lg font-black text-white">{t.tolerance}</p>
                <p className="text-[10px] text-zinc-500 mt-1">per team</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Early prediction multiplier ───────────────────────────────── */}
        <section>
          <h2 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <span>⏰</span> Early Prediction Bonus
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Predict earlier, earn more. A multiplier is applied to positive point
            totals when you lock in your prediction well before the match starts.
            The multiplier does <em className="text-zinc-300">not</em> amplify losses.
          </p>
          <div className="rounded-2xl border border-[#1e2d45] overflow-hidden">
            {MULTIPLIER_RULES.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  i < MULTIPLIER_RULES.length - 1 ? 'border-b border-[#1e2d45]' : ''
                } ${i === 0 ? 'bg-[#00D4B4]/5' : ''}`}
              >
                <span className="text-sm text-white">{r.window}</span>
                <span
                  className={`text-sm font-black ${
                    r.multiplier.startsWith('×1.0') ? 'text-zinc-500' : 'text-[#00D4B4]'
                  }`}
                >
                  {r.multiplier}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tips ─────────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-[#1e2d45] bg-[#0e1628] p-6">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <span>💡</span> Tips to Maximise Points
          </h2>
          <ul className="space-y-2.5">
            {[
              'Predict more than 48 h before the match to unlock the ×1.5 multiplier.',
              'Even if you are unsure about the winner, predicting scores gives partial credit (±2 pts per team) that can offset the −5 wrong-winner penalty.',
              'Tie / abandoned matches are voided — no points won or lost.',
              'Check the leaderboard often to see how your balance compares — and spot per-match results.',
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#FF7722]/20 text-[#FF7722] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-zinc-300">{tip}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a
            href="/"
            className="px-6 py-3 bg-[#FF7722] text-white font-black rounded-xl hover:bg-[#ff8c3a] transition-colors text-sm text-center"
          >
            Make Predictions
          </a>
          <a
            href="/leaderboard"
            className="px-6 py-3 border border-[#1e2d45] text-zinc-300 font-bold rounded-xl hover:bg-[#1e2d45] transition-colors text-sm text-center"
          >
            View Leaderboard
          </a>
        </div>
      </div>
    </div>
  );
}
