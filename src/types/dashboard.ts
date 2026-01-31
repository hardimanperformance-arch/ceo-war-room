// Dashboard Types - Centralized type definitions

export interface Metric {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  status: 'good' | 'warning' | 'critical' | 'scale' | 'watch' | 'fix' | 'kill';
  color?: string;
  isLive?: boolean;
}

export interface BrandBreakdown {
  name: string;
  value: number;
  color: string;
  isLive: boolean;
}

export interface RevenueTrend {
  month: string;
  fireblood: number;
  topg: number;
  dng: number;
  total: number;
}

export interface TrafficRow {
  brand: string;
  color: string;
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  avgDuration: number;
  pageViews: number;
  orders: number;
  convRate: number;
  isLive: boolean;
}

export interface AdsRow {
  brand: string;
  color: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  isLive: boolean;
}

export interface AdsSummary {
  spend: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export interface Product {
  name: string;
  revenue: number;
  units: number;
}

export interface SubscriptionMetrics {
  activeSubscribers: number | null;
  mrr: number | null;
  churnRate: number | null;
}

export interface ScorecardItem {
  metric: string;
  current: string;
  target: string;
  status: string;
  weight: string;
  isLive: boolean;
}

export interface EmailStats {
  totalContacts: number | null;
  activeContacts: number | null;
  unsubscribedContacts: number | null;
}

// Tab-specific data interfaces
export interface OverviewData {
  metrics: Metric[];
  brandBreakdown: BrandBreakdown[];
  revenueTrend: RevenueTrend[];
  trafficOverview: TrafficRow[];
  adsOverview: AdsRow[];
  adsSummary: AdsSummary | null;
  dataSource: string;
  period: string;
  error?: string;
}

export interface BrandData {
  metrics: Metric[];
  topProducts: Product[];
  subscriptionMetrics?: SubscriptionMetrics;
  acquirerScorecard?: ScorecardItem[];
  emailStats?: EmailStats;
  dataSource: string;
  period: string;
  error?: string;
}

export type DashboardData = OverviewData | BrandData;

export interface DateRange {
  start: Date;
  end: Date;
}

export type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export type TabId = 'overview' | 'fireblood' | 'gtop' | 'dng';

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
  color: string;
}
