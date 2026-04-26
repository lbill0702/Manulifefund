// ============================================================
// mockData.ts — Synthetic MPF fund NAV data (5 funds, ~5 years)
// ============================================================

import type { NavDataPoint } from './types';

// Deterministic pseudo-random seeded generator (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

interface FundSpec {
  id: string;
  name: string;
  startNav: number;
  annualDrift: number;    // expected annual return (e.g. 0.08 = 8%)
  annualVol: number;      // annual volatility (e.g. 0.18 = 18%)
  dividendFreq: number;   // how often dividends paid (days between), 0 = none
  dividendPct: number;    // dividend as % of NAV
  seed: number;
}

const FUND_SPECS: FundSpec[] = [
  { id: 'MPF-GBF', name: 'MPF Global Balanced Fund',        startNav: 10.00, annualDrift: 0.07, annualVol: 0.14, dividendFreq: 90,  dividendPct: 0.015, seed: 1001 },
  { id: 'MPF-GEF', name: 'MPF Global Equity Fund',          startNav: 12.50, annualDrift: 0.10, annualVol: 0.22, dividendFreq: 0,   dividendPct: 0,     seed: 1002 },
  { id: 'MPF-SBF', name: 'MPF Stable Bond Fund',            startNav:  8.80, annualDrift: 0.03, annualVol: 0.06, dividendFreq: 90,  dividendPct: 0.012, seed: 1003 },
  { id: 'MPF-GCF', name: 'MPF Greater China Fund',          startNav: 15.20, annualDrift: 0.06, annualVol: 0.28, dividendFreq: 180, dividendPct: 0.008, seed: 1004 },
  { id: 'MPF-UST', name: 'MPF US Technology Fund',          startNav: 20.00, annualDrift: 0.14, annualVol: 0.32, dividendFreq: 0,   dividendPct: 0,     seed: 1005 },
];

function generateFundHistory(spec: FundSpec): NavDataPoint[] {
  const rng = mulberry32(spec.seed);
  const startDate = new Date('2019-01-02');
  const endDate = new Date('2024-12-31');
  const data: NavDataPoint[] = [];

  const dailyDrift = spec.annualDrift / 252;
  const dailyVol = spec.annualVol / Math.sqrt(252);

  let nav = spec.startNav;
  let dayCount = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    // Box-Muller transform for Gaussian noise
    const u1 = rng();
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    const dailyReturn = dailyDrift + dailyVol * z;
    nav = nav * (1 + dailyReturn);
    nav = Math.max(nav, 0.01); // floor at 0.01

    dayCount++;

    // Determine dividend
    let dividend: number | undefined;
    if (spec.dividendFreq > 0 && dayCount % spec.dividendFreq === 0) {
      dividend = parseFloat((nav * spec.dividendPct).toFixed(4));
      nav = nav - dividend; // ex-dividend: NAV drops by dividend amount
    }

    const dateStr = d.toISOString().slice(0, 10);
    data.push({
      date: dateStr,
      fundId: spec.id,
      fundName: spec.name,
      nav: parseFloat(nav.toFixed(4)),
      ...(dividend !== undefined ? { dividend } : {}),
    });
  }

  return data;
}

// Generate all fund histories
const _cache: Record<string, NavDataPoint[]> = {};

export function getAllFundData(): Record<string, NavDataPoint[]> {
  if (Object.keys(_cache).length > 0) return _cache;
  for (const spec of FUND_SPECS) {
    _cache[spec.id] = generateFundHistory(spec);
  }
  return _cache;
}

export function getFundData(fundId: string): NavDataPoint[] {
  const all = getAllFundData();
  return all[fundId] ?? [];
}

export const FUND_IDS = FUND_SPECS.map((s) => s.id);
export const FUND_NAMES: Record<string, string> = Object.fromEntries(
  FUND_SPECS.map((s) => [s.id, s.name])
);
