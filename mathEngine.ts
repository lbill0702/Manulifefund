// ============================================================
// mathEngine.ts — Quantitative statistics engine
// All functions operate on raw NavDataPoint arrays.
// ============================================================

import type {
  NavDataPoint,
  FundStatistics,
  CumulativePerformance,
  CalendarPerformance,
  DividendRecord,
} from './types';

// ─── Constants ───────────────────────────────────────────────
const TRADING_DAYS_PER_YEAR = 252;
const DEFAULT_RISK_FREE_RATE = 0.04; // 4% annualized

// ─── Helpers ─────────────────────────────────────────────────

/** Sort an array of NAV points chronologically */
export function sortByDate(data: NavDataPoint[]): NavDataPoint[] {
  return [...data].sort((a, b) => a.date.localeCompare(b.date));
}

/** Return NAV value closest to (but not after) a target date */
function navOnOrBefore(sorted: NavDataPoint[], targetDate: string): number | null {
  let result: number | null = null;
  for (const pt of sorted) {
    if (pt.date <= targetDate) result = pt.nav;
    else break;
  }
  return result;
}

/** Get NAV for a specific YYYY-MM-DD exactly */
function exactNav(sorted: NavDataPoint[], date: string): number | null {
  const pt = sorted.find((d) => d.date === date);
  return pt ? pt.nav : null;
}

/** Return the last NAV in the sorted series */
function lastNav(sorted: NavDataPoint[]): number {
  return sorted[sorted.length - 1].nav;
}

/** Return the last date */
function lastDate(sorted: NavDataPoint[]): string {
  return sorted[sorted.length - 1].date;
}

/** Add N calendar months to a YYYY-MM-DD string */
function subtractMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** Get YYYY-01-01 for the year of a given date */
function startOfYear(dateStr: string): string {
  return `${dateStr.slice(0, 4)}-01-01`;
}

/** Get YYYY-12-31 for a given year number */
function endOfYear(year: number): string {
  return `${year}-12-31`;
}

// ─── Daily Returns ───────────────────────────────────────────

/**
 * Compute daily arithmetic returns.
 * r_t = (NAV_t - NAV_{t-1}) / NAV_{t-1}
 */
export function computeDailyReturns(sorted: NavDataPoint[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].nav;
    const curr = sorted[i].nav;
    if (prev > 0) {
      returns.push((curr - prev) / prev);
    }
  }
  return returns;
}

// ─── Cumulative Return ───────────────────────────────────────

/**
 * Point-to-point cumulative return.
 * Returns null if either price is unavailable.
 */
export function cumulativeReturn(
  sorted: NavDataPoint[],
  fromDate: string,
  toDate: string
): number | null {
  const start = navOnOrBefore(sorted, fromDate);
  const end = navOnOrBefore(sorted, toDate);
  if (start === null || end === null || start === 0) return null;
  return (end - start) / start;
}

// ─── Annualized Return ───────────────────────────────────────

/**
 * Annualized return using geometric compounding.
 * ((1 + cumulative_return)^(252 / tradingDays)) - 1
 */
export function annualizedReturn(
  cumulativeRet: number,
  tradingDays: number
): number {
  if (tradingDays <= 0) return 0;
  return Math.pow(1 + cumulativeRet, TRADING_DAYS_PER_YEAR / tradingDays) - 1;
}

// ─── Annualized Volatility ───────────────────────────────────

/**
 * Annualized volatility = std(daily_returns) * sqrt(252)
 * Uses population standard deviation (N denominator for consistency
 * with Bloomberg/industry convention for realized vol).
 */
export function annualizedVolatility(dailyReturns: number[]): number {
  const n = dailyReturns.length;
  if (n < 2) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / n;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

// ─── Sharpe Ratio ────────────────────────────────────────────

/**
 * Sharpe Ratio = (annualizedReturn - riskFreeRate) / annualizedVolatility
 */
export function sharpeRatio(
  annReturn: number,
  annVol: number,
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): number {
  if (annVol === 0) return 0;
  return (annReturn - riskFreeRate) / annVol;
}

// ─── Maximum Drawdown ────────────────────────────────────────

/**
 * Maximum Drawdown: the largest percentage decline from a running peak.
 *
 * Returns:
 *   maxDrawdown   — most negative value (e.g. -0.35 = -35%)
 *   peakDate      — date of the peak before max drawdown
 *   troughDate    — date of the trough (max loss point)
 *   drawdownSeries — {date, drawdown} for every point (underwater chart)
 */
export function computeMaxDrawdown(sorted: NavDataPoint[]): {
  maxDrawdown: number;
  peakDate: string;
  troughDate: string;
  drawdownSeries: { date: string; drawdown: number }[];
} {
  let peak = sorted[0].nav;
  let peakDate = sorted[0].date;
  let maxDD = 0;
  let maxDDPeakDate = peakDate;
  let maxDDTroughDate = peakDate;

  const drawdownSeries: { date: string; drawdown: number }[] = [];

  for (const pt of sorted) {
    if (pt.nav > peak) {
      peak = pt.nav;
      peakDate = pt.date;
    }
    const dd = peak > 0 ? (pt.nav - peak) / peak : 0;
    drawdownSeries.push({ date: pt.date, drawdown: dd });
    if (dd < maxDD) {
      maxDD = dd;
      maxDDPeakDate = peakDate;
      maxDDTroughDate = pt.date;
    }
  }

  return {
    maxDrawdown: maxDD,
    peakDate: maxDDPeakDate,
    troughDate: maxDDTroughDate,
    drawdownSeries,
  };
}

// ─── Calmar Ratio ────────────────────────────────────────────

/**
 * Calmar Ratio = annualizedReturn / |maxDrawdown|
 */
export function calmarRatio(annReturn: number, maxDD: number): number {
  if (maxDD === 0) return 0;
  return annReturn / Math.abs(maxDD);
}

// ─── Normalized Equity Curve (Base 100) ──────────────────────

export function buildEquityCurve(
  sorted: NavDataPoint[]
): { date: string; value: number }[] {
  if (sorted.length === 0) return [];
  const base = sorted[0].nav;
  return sorted.map((pt) => ({
    date: pt.date,
    value: parseFloat(((pt.nav / base) * 100).toFixed(4)),
  }));
}

// ─── Rolling Volatility (30-day window) ──────────────────────

export function buildRollingVolatility(
  sorted: NavDataPoint[],
  window = 30
): { date: string; vol: number }[] {
  const dailyReturns = computeDailyReturns(sorted);
  const result: { date: string; vol: number }[] = [];

  for (let i = window - 1; i < dailyReturns.length; i++) {
    const slice = dailyReturns.slice(i - window + 1, i + 1);
    const vol = annualizedVolatility(slice);
    // date aligns with sorted[i+1] (one offset for the return computation)
    result.push({ date: sorted[i + 1].date, vol: parseFloat((vol * 100).toFixed(4)) });
  }
  return result;
}

// ─── Full Statistics Aggregation ─────────────────────────────

export function computeFundStatistics(
  rawData: NavDataPoint[],
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): FundStatistics {
  const sorted = sortByDate(rawData);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const tradingDays = sorted.length - 1; // number of return observations

  const dailyReturns = computeDailyReturns(sorted);
  const cumRet = (last.nav - first.nav) / first.nav;
  const annRet = annualizedReturn(cumRet, tradingDays);
  const annVol = annualizedVolatility(dailyReturns);
  const sharpe = sharpeRatio(annRet, annVol, riskFreeRate);

  const { maxDrawdown, peakDate, troughDate, drawdownSeries } = computeMaxDrawdown(sorted);
  const calmar = calmarRatio(annRet, maxDrawdown);

  const equityCurve = buildEquityCurve(sorted);
  const rollingVolatility = buildRollingVolatility(sorted);

  return {
    fundId: first.fundId,
    fundName: first.fundName,
    totalDays: sorted.length,
    tradingDays,
    cumulativeReturn: cumRet,
    annualizedReturn: annRet,
    annualizedVolatility: annVol,
    sharpeRatio: sharpe,
    maxDrawdown,
    maxDrawdownStartDate: peakDate,
    maxDrawdownEndDate: troughDate,
    calmarRatio: calmar,
    equityCurve,
    drawdownSeries,
    rollingVolatility,
  };
}

// ─── Cumulative Performance Table ────────────────────────────

export function buildCumulativePerformance(
  allFunds: Record<string, NavDataPoint[]>
): CumulativePerformance[] {
  return Object.entries(allFunds).map(([fundId, raw]) => {
    const sorted = sortByDate(raw);
    const latest = lastDate(sorted);
    const getNav = (d: string) => navOnOrBefore(sorted, d);

    const end = lastNav(sorted);
    const startYTD = getNav(startOfYear(latest));
    const start1M = getNav(subtractMonths(latest, 1));
    const start3M = getNav(subtractMonths(latest, 3));
    const start6M = getNav(subtractMonths(latest, 6));
    const start1Y = getNav(subtractMonths(latest, 12));
    const start3Y = getNav(subtractMonths(latest, 36));
    const start5Y = getNav(subtractMonths(latest, 60));
    const launch = sorted[0].nav;

    const pct = (s: number | null): number | null =>
      s && s > 0 ? (end - s) / s : null;

    return {
      fundId,
      fundName: sorted[0].fundName,
      ytd: pct(startYTD),
      oneMonth: pct(start1M),
      threeMonth: pct(start3M),
      sixMonth: pct(start6M),
      oneYear: pct(start1Y),
      threeYear: pct(start3Y),
      fiveYear: pct(start5Y),
      sinceLaunch: (end - launch) / launch,
    };
  });
}

// ─── Calendar Year Performance ────────────────────────────────

export function buildCalendarPerformance(
  allFunds: Record<string, NavDataPoint[]>
): CalendarPerformance[] {
  const years = [2023, 2022, 2021, 2020, 2019] as const;

  return Object.entries(allFunds).map(([fundId, raw]) => {
    const sorted = sortByDate(raw);

    const yearReturn = (year: number): number | null => {
      const startNav = navOnOrBefore(sorted, `${year}-01-01`);
      const endNav = navOnOrBefore(sorted, `${year}-12-31`);
      if (!startNav || !endNav || startNav === 0) return null;
      return (endNav - startNav) / startNav;
    };

    return {
      fundId,
      fundName: sorted[0].fundName,
      y2023: yearReturn(2023),
      y2022: yearReturn(2022),
      y2021: yearReturn(2021),
      y2020: yearReturn(2020),
      y2019: yearReturn(2019),
    };
  });
}

// ─── Dividend Records ─────────────────────────────────────────

export function buildDividendRecords(
  allFunds: Record<string, NavDataPoint[]>
): DividendRecord[] {
  const records: DividendRecord[] = [];

  for (const [, data] of Object.entries(allFunds)) {
    const sorted = sortByDate(data);
    const divPoints = sorted.filter((d) => d.dividend && d.dividend > 0);

    for (const pt of divPoints) {
      const annualizedYield = pt.nav > 0 ? (pt.dividend! * 4) / pt.nav : 0; // assume quarterly
      records.push({
        fundId: pt.fundId,
        fundName: pt.fundName,
        exDate: pt.date,
        dividendPerUnit: pt.dividend!,
        annualizedYield,
      });
    }
  }

  return records.sort((a, b) => b.exDate.localeCompare(a.exDate));
}

// ─── Utility formatters ───────────────────────────────────────

export function fmtPct(val: number | null, decimals = 2): string {
  if (val === null) return '—';
  return `${val >= 0 ? '+' : ''}${(val * 100).toFixed(decimals)}%`;
}

export function fmtNum(val: number, decimals = 4): string {
  return val.toFixed(decimals);
}
