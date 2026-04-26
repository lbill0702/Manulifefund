// ============================================================
// types.ts — Core data interfaces for the MPF Fund Dashboard
// ============================================================

/** A single NAV data point from the pipeline */
export interface NavDataPoint {
  date: string;        // "YYYY-MM-DD"
  fundId: string;
  fundName: string;
  nav: number;
  dividend?: number;   // optional dividend per unit on ex-date
}

/** A fund's full history — array of NAV points */
export type FundHistory = NavDataPoint[];

/** Dividend event record */
export interface DividendRecord {
  fundId: string;
  fundName: string;
  exDate: string;
  dividendPerUnit: number;
  annualizedYield: number;  // computed
}

/** Cumulative performance periods */
export interface CumulativePerformance {
  fundId: string;
  fundName: string;
  ytd: number | null;
  oneMonth: number | null;
  threeMonth: number | null;
  sixMonth: number | null;
  oneYear: number | null;
  threeYear: number | null;
  fiveYear: number | null;
  sinceLaunch: number | null;
}

/** Calendar year performance */
export interface CalendarPerformance {
  fundId: string;
  fundName: string;
  y2023: number | null;
  y2022: number | null;
  y2021: number | null;
  y2020: number | null;
  y2019: number | null;
}

/** Full statistical profile for a single fund */
export interface FundStatistics {
  fundId: string;
  fundName: string;
  totalDays: number;
  tradingDays: number;

  // Core metrics
  cumulativeReturn: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;         // e.g., -0.23 means -23%
  maxDrawdownStartDate: string;
  maxDrawdownEndDate: string;
  calmarRatio: number;

  // Rolling data for charts
  equityCurve: { date: string; value: number }[];         // base-100 normalized
  drawdownSeries: { date: string; drawdown: number }[];    // 0 to -1
  rollingVolatility: { date: string; vol: number }[];      // 30-day rolling annualized
}

/** Sort direction */
export type SortDir = 'asc' | 'desc' | null;

/** Table sort state */
export interface SortState {
  column: string;
  direction: SortDir;
}

/** Active tab on Module 1 */
export type ActiveTab = 'cumulative' | 'calendar' | 'dividend';
