// ============================================================
// App.tsx — Main layout integrating Module 1 + Module 2
// ============================================================
//
// Setup instructions:
//   npm create vite@latest mpf-dashboard -- --template react-ts
//   cd mpf-dashboard
//   npm install recharts
//   npm install -D tailwindcss postcss autoprefixer
//   npx tailwindcss init -p
//   # Add to tailwind.config.js content: ["./src/**/*.{ts,tsx}"]
//   # Add @tailwind directives to index.css
//   # Copy all .ts/.tsx files into src/
//   npm run dev
// ============================================================

import React, { useState, useMemo } from 'react';
import { FundTable } from './FundTable';
import { FundAnalyzer } from './FundAnalyzer';
import { getAllFundData } from './mockData';
import {
  buildCumulativePerformance,
  buildCalendarPerformance,
  buildDividendRecords,
} from './mathEngine';
import type { NavDataPoint } from './types';

// ─── Types ────────────────────────────────────────────────────

interface SelectedFund {
  fundId: string;
  fundName: string;
  data: NavDataPoint[];
}

// ─── Header ───────────────────────────────────────────────────

const AppHeader: React.FC = () => (
  <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Manulife-inspired logo mark */}
        <div className="w-7 h-7 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <span className="text-emerald-400 text-xs font-bold">M</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-100 tracking-tight">Manulife MPF</span>
          <span className="text-xs text-slate-500 font-medium">Fund Analytics Platform</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Synthetic data · Production-ready</span>
        </div>
        <span className="text-xs text-slate-600 font-mono">v1.0.0</span>
      </div>
    </div>
  </header>
);

// ─── Breadcrumb ───────────────────────────────────────────────

const Breadcrumb: React.FC<{ selected: SelectedFund | null }> = ({ selected }) => (
  <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
    <span className="hover:text-slate-300 cursor-pointer transition-colors">Fund Portal</span>
    {selected && (
      <>
        <span className="text-slate-600">›</span>
        <span className="text-slate-300">{selected.fundName}</span>
      </>
    )}
  </nav>
);

// ─── APP ──────────────────────────────────────────────────────

export default function App() {
  const [selectedFund, setSelectedFund] = useState<SelectedFund | null>(null);

  // Load all fund data once
  const allFundData = useMemo(() => getAllFundData(), []);

  // Build table data
  const cumulative = useMemo(() => buildCumulativePerformance(allFundData), [allFundData]);
  const calendar   = useMemo(() => buildCalendarPerformance(allFundData),   [allFundData]);
  const dividends  = useMemo(() => buildDividendRecords(allFundData),        [allFundData]);

  const handleSelectFund = (fundId: string, fundName: string) => {
    const data = allFundData[fundId] ?? [];
    setSelectedFund({ fundId, fundName, data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => setSelectedFund(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumb selected={selectedFund} />

        {/* ── Module 1 or Module 2 ── */}
        {selectedFund ? (
          <FundAnalyzer
            key={selectedFund.fundId}
            fundId={selectedFund.fundId}
            fundName={selectedFund.fundName}
            rawData={selectedFund.data}
            onBack={handleBack}
          />
        ) : (
          <>
            {/* Summary banner */}
            <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="col-span-1 sm:col-span-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-6">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-100 mb-1">
                  MPF Fund Analytics
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Institutional-grade performance attribution and risk analytics for
                  the Manulife Global Select (MPF) Scheme. Click any fund name to
                  launch the quantitative analyzer.
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  {[
                    { label: 'Funds Tracked', value: Object.keys(allFundData).length },
                    { label: 'Data History', value: '6 Years' },
                    { label: 'Risk Metrics', value: '6 Computed' },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-4 py-2">
                      <p className="text-xs text-slate-500">{s.label}</p>
                      <p className="text-lg font-semibold text-emerald-400 font-mono">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Navigation</p>
                  <ul className="space-y-1.5">
                    {[
                      { emoji: '📊', text: 'Cumulative performance across periods' },
                      { emoji: '📅', text: 'Calendar year returns 2019–2023' },
                      { emoji: '💰', text: 'Dividend history & annualized yield' },
                      { emoji: '🔬', text: 'Deep-dive: Sharpe, MDD, Calmar' },
                    ].map((item) => (
                      <li key={item.text} className="flex items-start gap-2 text-xs text-slate-400">
                        <span className="text-base leading-none mt-0.5">{item.emoji}</span>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-slate-600 mt-3 border-t border-slate-700/40 pt-3">
                  All data is synthetic. For illustration only.
                </p>
              </div>
            </div>

            <FundTable
              cumulative={cumulative}
              calendar={calendar}
              dividends={dividends}
              onSelectFund={handleSelectFund}
            />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-slate-600">
            © 2024 Manulife Fund Analytics Platform · Built with React + Recharts + Tailwind CSS
          </p>
          <p className="text-xs text-slate-600">
            This application contains synthetic data for demonstration purposes only.
            Not investment advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
