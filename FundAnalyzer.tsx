// ============================================================
// FundAnalyzer.tsx — Module 2: Quantitative fund analyzer
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { FundStatistics } from './types';
import type { NavDataPoint } from './types';
import { computeFundStatistics, fmtPct, fmtNum } from './mathEngine';

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  subLabel?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'warning';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subLabel, sentiment = 'neutral' }) => {
  const valueColor = {
    positive: 'text-emerald-400',
    negative: 'text-rose-400',
    neutral:  'text-slate-100',
    warning:  'text-amber-400',
  }[sentiment];

  return (
    <div className="bg-slate-800/70 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-semibold font-mono ${valueColor} leading-none`}>{value}</p>
      {subLabel && <p className="text-xs text-slate-500 mt-1.5">{subLabel}</p>}
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────

const EquityTooltip: React.FC<{ active?: boolean; payload?: { value: number; name: string }[]; label?: string }> = ({
  active, payload, label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.name === 'drawdown' ? '#f43f5e' : '#34d399' }}>
          {p.name === 'drawdown'
            ? `Drawdown: ${(p.value * 100).toFixed(2)}%`
            : `NAV: ${p.value.toFixed(2)}`}
        </p>
      ))}
    </div>
  );
};

// ─── Risk-free rate slider ────────────────────────────────────

const RFRControl: React.FC<{ rfr: number; onChange: (v: number) => void }> = ({ rfr, onChange }) => (
  <div className="flex items-center gap-3">
    <label className="text-xs text-slate-400 whitespace-nowrap">Risk-Free Rate</label>
    <input
      type="range"
      min={0}
      max={8}
      step={0.5}
      value={rfr * 100}
      onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
      className="w-28 accent-emerald-400"
    />
    <span className="text-xs font-mono text-emerald-400 w-8">{(rfr * 100).toFixed(1)}%</span>
  </div>
);

// ─── Chart period selector ────────────────────────────────────

type Period = '1Y' | '3Y' | '5Y' | 'MAX';

const PeriodBtn: React.FC<{ label: Period; active: boolean; onClick: () => void }> = ({
  label, active, onClick,
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
      active
        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
        : 'text-slate-400 hover:text-slate-200 border border-transparent'
    }`}
  >
    {label}
  </button>
);

// ─── Subsample data to reduce chart density ───────────────────

function subsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  return arr.filter((_, i) => i % step === 0 || i === arr.length - 1);
}

function filterByPeriod<T extends { date: string }>(arr: T[], period: Period): T[] {
  if (period === 'MAX') return arr;
  const now = new Date('2024-12-31');
  const months = { '1Y': 12, '3Y': 36, '5Y': 60 }[period];
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return arr.filter((d) => d.date >= cutoffStr);
}

// ─── MAIN COMPONENT ──────────────────────────────────────────

interface FundAnalyzerProps {
  fundId: string;
  fundName: string;
  rawData: NavDataPoint[];
  onBack: () => void;
}

export const FundAnalyzer: React.FC<FundAnalyzerProps> = ({
  fundId,
  fundName,
  rawData,
  onBack,
}) => {
  const [rfr, setRfr] = useState(0.04);
  const [period, setPeriod] = useState<Period>('MAX');

  const stats: FundStatistics = useMemo(
    () => computeFundStatistics(rawData, rfr),
    [rawData, rfr]
  );

  // Filtered + subsampled chart data
  const equityData = useMemo(() => {
    const filtered = filterByPeriod(stats.equityCurve, period);
    return subsample(filtered, 400);
  }, [stats.equityCurve, period]);

  const drawdownData = useMemo(() => {
    const filtered = filterByPeriod(stats.drawdownSeries, period);
    return subsample(filtered, 400);
  }, [stats.drawdownSeries, period]);

  // Sentiment helpers
  const retSentiment = stats.annualizedReturn >= 0 ? 'positive' : 'negative';
  const sharpeSentiment = stats.sharpeRatio >= 1 ? 'positive' : stats.sharpeRatio >= 0 ? 'warning' : 'negative';
  const ddSentiment = stats.maxDrawdown > -0.1 ? 'positive' : stats.maxDrawdown > -0.25 ? 'warning' : 'negative';
  const calmarSentiment = stats.calmarRatio >= 0.5 ? 'positive' : stats.calmarRatio >= 0.25 ? 'warning' : 'negative';

  // X-axis tick formatter
  const xTickFmt = useCallback((d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${dt.toLocaleString('en', { month: 'short' })} '${String(dt.getFullYear()).slice(2)}`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors mb-2"
          >
            ← Back to Fund List
          </button>
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">{fundName}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fund ID: {fundId} · {stats.tradingDays} trading days · Data through 2024-12-31
          </p>
        </div>
        <RFRControl rfr={rfr} onChange={setRfr} />
      </div>

      {/* ── Key Statistics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Annualized Return"
          value={fmtPct(stats.annualizedReturn)}
          subLabel="Geometric CAGR"
          sentiment={retSentiment}
        />
        <StatCard
          label="Cumulative Return"
          value={fmtPct(stats.cumulativeReturn)}
          subLabel="Since inception"
          sentiment={retSentiment}
        />
        <StatCard
          label="Annualized Volatility"
          value={fmtPct(stats.annualizedVolatility)}
          subLabel="σ × √252"
          sentiment="neutral"
        />
        <StatCard
          label="Sharpe Ratio"
          value={fmtNum(stats.sharpeRatio, 3)}
          subLabel={`RFR = ${(rfr * 100).toFixed(1)}%`}
          sentiment={sharpeSentiment}
        />
        <StatCard
          label="Max Drawdown"
          value={fmtPct(stats.maxDrawdown)}
          subLabel={`${stats.maxDrawdownStartDate} → ${stats.maxDrawdownEndDate}`}
          sentiment={ddSentiment}
        />
        <StatCard
          label="Calmar Ratio"
          value={fmtNum(stats.calmarRatio, 3)}
          subLabel="CAGR / |Max DD|"
          sentiment={calmarSentiment}
        />
      </div>

      {/* ── Period Selector ── */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-slate-500 mr-1">Period:</span>
        {(['1Y', '3Y', '5Y', 'MAX'] as Period[]).map((p) => (
          <PeriodBtn key={p} label={p} active={period === p} onClick={() => setPeriod(p)} />
        ))}
      </div>

      {/* ── Equity Curve ── */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Normalized Equity Curve</h3>
          <p className="text-xs text-slate-500">Base 100 at inception · Total return including dividends</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={equityData} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={xTickFmt}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(0)}
              width={44}
            />
            <Tooltip content={<EquityTooltip />} />
            <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 2" />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#34d399"
              strokeWidth={1.8}
              dot={false}
              name="equity"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Underwater (Drawdown) Chart ── */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Drawdown (Underwater Chart)</h3>
          <p className="text-xs text-slate-500">
            Max drawdown: <span className="text-rose-400 font-mono font-medium">{fmtPct(stats.maxDrawdown)}</span>
            {' '}from {stats.maxDrawdownStartDate} to {stats.maxDrawdownEndDate}
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={drawdownData} margin={{ top: 4, right: 12, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={xTickFmt}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              domain={['auto', 0]}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              width={44}
            />
            <Tooltip
              formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, 'Drawdown']}
              contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine y={0} stroke="#475569" />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#f43f5e"
              strokeWidth={1.5}
              fill="url(#ddGrad)"
              isAnimationActive={false}
              name="drawdown"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Rolling Volatility ── */}
      {stats.rollingVolatility.length > 0 && (
        <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-5 shadow-xl">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-200">30-Day Rolling Volatility (Annualized)</h3>
            <p className="text-xs text-slate-500">σ_{'{30d}'} × √252 — measures realized risk over trailing month</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={subsample(filterByPeriod(stats.rollingVolatility, period), 400)}
              margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
            >
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                tickFormatter={xTickFmt}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={60}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                width={44}
              />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(2)}%`, '30d Vol (ann.)'] }
                contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="vol"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fill="url(#volGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Methodology note ── */}
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-5 py-4">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Methodology</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-500">
          <p><span className="text-slate-400">Daily Return:</span> (NAV_t − NAV_{'{t−1}'}) / NAV_{'{t−1}'}</p>
          <p><span className="text-slate-400">Ann. Return:</span> (1 + R_cum)^(252 / N) − 1</p>
          <p><span className="text-slate-400">Ann. Volatility:</span> σ_daily × √252  [sample std dev]</p>
          <p><span className="text-slate-400">Sharpe Ratio:</span> (R_ann − RFR) / σ_ann</p>
          <p><span className="text-slate-400">Max Drawdown:</span> min((NAV_t − Peak_t) / Peak_t)</p>
          <p><span className="text-slate-400">Calmar Ratio:</span> R_ann / |Max Drawdown|</p>
        </div>
      </div>
    </div>
  );
};

export default FundAnalyzer;
