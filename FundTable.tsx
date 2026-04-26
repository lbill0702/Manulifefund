// ============================================================
// FundTable.tsx — Module 1: Tabular fund portal replication
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import type {
  ActiveTab,
  SortState,
  CumulativePerformance,
  CalendarPerformance,
  DividendRecord,
} from './types';
import { fmtPct } from './mathEngine';

// ─── Sub-components ──────────────────────────────────────────

const SortIcon: React.FC<{ col: string; sort: SortState }> = ({ col, sort }) => {
  if (sort.column !== col) {
    return <span className="ml-1 text-slate-400 opacity-40">⇅</span>;
  }
  return (
    <span className="ml-1 text-emerald-400">
      {sort.direction === 'asc' ? '↑' : '↓'}
    </span>
  );
};

function PerfCell({ value }: { value: number | null }) {
  if (value === null) {
    return <td className="px-4 py-3 text-right text-slate-500 text-sm font-mono">—</td>;
  }
  const isPos = value >= 0;
  const cls = isPos
    ? 'text-emerald-400 font-mono text-sm'
    : 'text-rose-400 font-mono text-sm';
  return (
    <td className={`px-4 py-3 text-right ${cls}`}>
      {fmtPct(value)}
    </td>
  );
}

// ─── Sort helpers ─────────────────────────────────────────────

function sortData<T>(data: T[], sort: SortState): T[] {
  if (!sort.column || !sort.direction) return data;
  return [...data].sort((a, b) => {
    const av = (a as Record<string, unknown>)[sort.column];
    const bv = (b as Record<string, unknown>)[sort.column];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    const cmp = typeof av === 'string'
      ? (av as string).localeCompare(bv as string)
      : (av as number) - (bv as number);
    return sort.direction === 'asc' ? cmp : -cmp;
  });
}

// ─── Table Header ─────────────────────────────────────────────

const Th: React.FC<{
  col: string;
  label: string;
  sort: SortState;
  onSort: (col: string) => void;
  align?: 'left' | 'right';
}> = ({ col, label, sort, onSort, align = 'right' }) => (
  <th
    className={`px-4 py-3 text-${align} text-xs font-semibold tracking-wider text-slate-400 uppercase cursor-pointer select-none hover:text-slate-200 transition-colors whitespace-nowrap`}
    onClick={() => onSort(col)}
  >
    {label}
    <SortIcon col={col} sort={sort} />
  </th>
);

// ─── Tab Button ───────────────────────────────────────────────

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-5 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all duration-200 ${
      active
        ? 'border-emerald-400 text-emerald-400 bg-slate-800/60'
        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'
    }`}
  >
    {children}
  </button>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────

interface FundTableProps {
  cumulative: CumulativePerformance[];
  calendar: CalendarPerformance[];
  dividends: DividendRecord[];
  onSelectFund: (fundId: string, fundName: string) => void;
}

export const FundTable: React.FC<FundTableProps> = ({
  cumulative,
  calendar,
  dividends,
  onSelectFund,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cumulative');
  const [sort, setSort] = useState<SortState>({ column: '', direction: null });
  const [search, setSearch] = useState('');

  const handleSort = useCallback((col: string) => {
    setSort((prev) => {
      if (prev.column !== col) return { column: col, direction: 'asc' };
      if (prev.direction === 'asc') return { column: col, direction: 'desc' };
      return { column: '', direction: null };
    });
  }, []);

  // ── Cumulative Tab ──
  const filteredCumulative = useMemo(() => {
    const f = cumulative.filter((r) =>
      r.fundName.toLowerCase().includes(search.toLowerCase())
    );
    return sortData(f, sort);
  }, [cumulative, search, sort]);

  // ── Calendar Tab ──
  const filteredCalendar = useMemo(() => {
    const f = calendar.filter((r) =>
      r.fundName.toLowerCase().includes(search.toLowerCase())
    );
    return sortData(f, sort);
  }, [calendar, search, sort]);

  // ── Dividend Tab ──
  const filteredDividends = useMemo(() => {
    const f = dividends.filter((r) =>
      r.fundName.toLowerCase().includes(search.toLowerCase())
    );
    return sortData(f, sort);
  }, [dividends, search, sort]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/60 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 tracking-tight">
              Fund Performance Portal
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manulife Global Select (MPF) · Click a fund name to analyze
            </p>
          </div>
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">⌕</span>
            <input
              type="text"
              placeholder="Search funds..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors w-64"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-700">
          <TabBtn active={activeTab === 'cumulative'} onClick={() => { setActiveTab('cumulative'); setSort({ column: '', direction: null }); }}>
            Performance — Cumulative
          </TabBtn>
          <TabBtn active={activeTab === 'calendar'} onClick={() => { setActiveTab('calendar'); setSort({ column: '', direction: null }); }}>
            Performance — Calendar Year
          </TabBtn>
          <TabBtn active={activeTab === 'dividend'} onClick={() => { setActiveTab('dividend'); setSort({ column: '', direction: null }); }}>
            Dividend History
          </TabBtn>
        </div>
      </div>

      {/* Table area */}
      <div className="overflow-x-auto">
        {/* ── Tab A: Cumulative ── */}
        {activeTab === 'cumulative' && (
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                <Th col="fundName" label="Fund Name" sort={sort} onSort={handleSort} align="left" />
                <Th col="ytd"         label="YTD"          sort={sort} onSort={handleSort} />
                <Th col="oneMonth"    label="1 Month"       sort={sort} onSort={handleSort} />
                <Th col="threeMonth"  label="3 Month"       sort={sort} onSort={handleSort} />
                <Th col="sixMonth"    label="6 Month"       sort={sort} onSort={handleSort} />
                <Th col="oneYear"     label="1 Year"        sort={sort} onSort={handleSort} />
                <Th col="threeYear"   label="3 Year"        sort={sort} onSort={handleSort} />
                <Th col="fiveYear"    label="5 Year"        sort={sort} onSort={handleSort} />
                <Th col="sinceLaunch" label="Since Launch"  sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filteredCumulative.map((row, i) => (
                <tr
                  key={row.fundId}
                  className={`border-b border-slate-700/40 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'}`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelectFund(row.fundId, row.fundName)}
                      className="text-sm font-medium text-slate-200 hover:text-emerald-400 transition-colors text-left underline-offset-2 hover:underline"
                    >
                      {row.fundName}
                    </button>
                  </td>
                  <PerfCell value={row.ytd} />
                  <PerfCell value={row.oneMonth} />
                  <PerfCell value={row.threeMonth} />
                  <PerfCell value={row.sixMonth} />
                  <PerfCell value={row.oneYear} />
                  <PerfCell value={row.threeYear} />
                  <PerfCell value={row.fiveYear} />
                  <PerfCell value={row.sinceLaunch} />
                </tr>
              ))}
              {filteredCumulative.length === 0 && (
                <tr><td colSpan={9} className="text-center py-8 text-slate-500 text-sm">No funds match your search.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── Tab B: Calendar Year ── */}
        {activeTab === 'calendar' && (
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                <Th col="fundName" label="Fund Name" sort={sort} onSort={handleSort} align="left" />
                <Th col="y2023" label="2023" sort={sort} onSort={handleSort} />
                <Th col="y2022" label="2022" sort={sort} onSort={handleSort} />
                <Th col="y2021" label="2021" sort={sort} onSort={handleSort} />
                <Th col="y2020" label="2020" sort={sort} onSort={handleSort} />
                <Th col="y2019" label="2019" sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filteredCalendar.map((row, i) => (
                <tr
                  key={row.fundId}
                  className={`border-b border-slate-700/40 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'}`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelectFund(row.fundId, row.fundName)}
                      className="text-sm font-medium text-slate-200 hover:text-emerald-400 transition-colors text-left hover:underline underline-offset-2"
                    >
                      {row.fundName}
                    </button>
                  </td>
                  <PerfCell value={row.y2023} />
                  <PerfCell value={row.y2022} />
                  <PerfCell value={row.y2021} />
                  <PerfCell value={row.y2020} />
                  <PerfCell value={row.y2019} />
                </tr>
              ))}
              {filteredCalendar.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500 text-sm">No funds match your search.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* ── Tab C: Dividend ── */}
        {activeTab === 'dividend' && (
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700">
                <Th col="fundName"       label="Fund Name"              sort={sort} onSort={handleSort} align="left" />
                <Th col="exDate"         label="Ex-Dividend Date"        sort={sort} onSort={handleSort} />
                <Th col="dividendPerUnit" label="Dividend / Unit"        sort={sort} onSort={handleSort} />
                <Th col="annualizedYield" label="Annualized Yield"       sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filteredDividends.map((row, i) => (
                <tr
                  key={`${row.fundId}-${row.exDate}`}
                  className={`border-b border-slate-700/40 hover:bg-slate-800/50 transition-colors ${i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/20'}`}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelectFund(row.fundId, row.fundName)}
                      className="text-sm font-medium text-slate-200 hover:text-emerald-400 transition-colors text-left hover:underline underline-offset-2"
                    >
                      {row.fundName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-300 font-mono">{row.exDate}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-300 font-mono">
                    {row.dividendPerUnit.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-mono text-emerald-400">
                    {fmtPct(row.annualizedYield)}
                  </td>
                </tr>
              ))}
              {filteredDividends.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500 text-sm">No dividend records match your search.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-700/60 bg-slate-800/30">
        <p className="text-xs text-slate-500">
          Data as of {new Date().toLocaleDateString('en-HK', { year: 'numeric', month: 'long', day: 'numeric' })}
          {' '}· All returns are total return in fund currency · Past performance is not indicative of future results.
        </p>
      </div>
    </div>
  );
};

export default FundTable;
