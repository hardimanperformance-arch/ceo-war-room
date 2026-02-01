'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';
import TimePeriodSelector from './TimePeriodSelector';
import type {
  Metric, BrandBreakdown, RevenueTrend, TrafficRow, AdsRow,
  AdsSummary, Product, SubscriptionMetrics, ScorecardItem, EmailStats,
  DateRange, TimePeriod, TabId, Tab, OverviewData, BrandData, DashboardData,
  ComparisonPeriod, MetricWithDelta
} from '../types/dashboard';
import {
  getPeriodDates, getPreviousPeriodDates, getComparisonLabel,
  formatForApi, calculateDelta, parseMetricValue
} from '../lib/utils/period';
import AIInsights from './AIInsights';

// ============================================================================
// SKELETON COMPONENTS
// ============================================================================

const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border-2 border-zinc-800 bg-zinc-900">
      <div className="skeleton h-4 w-24 rounded mb-3" />
      <div className="skeleton h-8 w-32 rounded" />
    </div>
  );
});

const SkeletonChart = memo(function SkeletonChart() {
  return (
    <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
      <div className="skeleton h-6 w-48 rounded mb-4" />
      <div className="skeleton h-[300px] w-full rounded" />
    </div>
  );
});

const SkeletonTable = memo(function SkeletonTable() {
  return (
    <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
      <div className="skeleton h-6 w-48 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-12 w-full rounded" />
        ))}
      </div>
    </div>
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <SkeletonChart />
        </div>
        <div className="lg:col-span-4">
          <SkeletonChart />
        </div>
      </div>
      <SkeletonTable />
    </div>
  );
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'good': case 'scale': return 'bg-emerald-500';
    case 'warning': case 'watch': case 'fix': return 'bg-amber-500';
    case 'critical': case 'kill': return 'bg-red-500';
    default: return 'bg-zinc-500';
  }
};

const getStatusBg = (status: string): string => {
  switch (status) {
    case 'good': case 'scale': return 'bg-emerald-950/50 border-emerald-500/50 glow-green';
    case 'warning': case 'watch': case 'fix': return 'bg-amber-950/50 border-amber-500/50 glow-amber';
    case 'critical': case 'kill': return 'bg-red-950/50 border-red-500/50 glow-red';
    default: return 'bg-zinc-800/50 border-zinc-600/50';
  }
};

const formatCurrency = (value: number, decimals = 0): string => {
  return `£${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface MetricCardProps {
  metric: MetricWithDelta;
  comparisonLabel?: string;
  compact?: boolean;
}

const MetricCard = memo(function MetricCard({ metric, comparisonLabel, compact }: MetricCardProps) {
  const hasDelta = metric.deltaPercent !== undefined && metric.deltaPercent !== null;
  const deltaDirection = hasDelta
    ? metric.deltaPercent! > 0.5 ? 'up' : metric.deltaPercent! < -0.5 ? 'down' : 'flat'
    : null;

  return (
    <div className={`metric-card p-3 md:p-4 rounded-xl border-2 ${getStatusBg(metric.status)} transition-all`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs md:text-sm text-zinc-400 truncate pr-1">{metric.label}</span>
        {metric.isLive && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot flex-shrink-0" />
        )}
      </div>
      {hasDelta ? (
        /* Compare mode: stack value and delta vertically for more space */
        <div className="space-y-1">
          <div
            className="text-lg md:text-xl lg:text-2xl font-black text-white truncate tabular-nums"
            style={metric.color ? { color: metric.color } : {}}
          >
            {metric.value}
          </div>
          <div className="flex items-center justify-between gap-1">
            <div className={`text-xs md:text-sm font-bold tabular-nums ${
              deltaDirection === 'up' ? 'text-emerald-400' :
              deltaDirection === 'down' ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {deltaDirection === 'up' ? '↑' : deltaDirection === 'down' ? '↓' : ''}
              {metric.deltaPercent! > 0 ? '+' : ''}{metric.deltaPercent!.toFixed(1)}%
            </div>
            {metric.previousValue && (
              <div className="text-xs text-zinc-500 truncate hidden sm:block" title={`was ${metric.previousValue}`}>
                was {metric.previousValue}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Non-compare mode: side by side */
        <div className="flex items-end justify-between gap-2">
          <div
            className="text-lg md:text-xl lg:text-2xl font-black text-white truncate tabular-nums"
            style={metric.color ? { color: metric.color } : {}}
          >
            {metric.value}
          </div>
          {metric.change && (
            <div className={`text-xs font-bold whitespace-nowrap ${
              metric.changeType === 'positive' ? 'text-emerald-400' :
              metric.changeType === 'negative' ? 'text-red-400' : 'text-zinc-400'
            }`}>
              {metric.change}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface LiveBadgeProps {
  variant?: 'green' | 'blue';
}

const LiveBadge = memo(function LiveBadge({ variant = 'green' }: LiveBadgeProps) {
  const colorClass = variant === 'blue' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-black';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorClass} flex items-center gap-1.5`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      LIVE
    </span>
  );
});

interface SectionHeaderProps {
  title: string;
  badge?: 'live' | 'calculated';
}

const SectionHeader = memo(function SectionHeader({ title, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg md:text-xl font-black text-white">{title}</h2>
      {badge === 'live' && <LiveBadge />}
      {badge === 'calculated' && (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
          CALCULATED
        </span>
      )}
    </div>
  );
});

interface ProductListProps {
  products: Product[];
}

const ProductList = memo(function ProductList({ products }: ProductListProps) {
  return (
    <div className="space-y-2">
      {products.map((product) => (
        <div key={product.name} className="p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
          <div className="flex justify-between items-center">
            <span className="font-bold text-white truncate mr-2">{product.name}</span>
            <span className="text-emerald-400 font-bold tabular-nums whitespace-nowrap">
              {formatCurrency(product.revenue)}
            </span>
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            {product.units.toLocaleString()} units sold
          </div>
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// TAB RENDERERS
// ============================================================================

interface OverviewTabProps {
  data: OverviewData;
  metricsWithDeltas: MetricWithDelta[];
  comparisonLabel?: string;
  comparisonLoading?: boolean;
  comparisonEnabled?: boolean;
  previousData: DashboardData | null;
  period: TimePeriod;
  tab: TabId;
}

const OverviewTab = memo(function OverviewTab({ data, metricsWithDeltas, comparisonLabel, comparisonLoading, comparisonEnabled, previousData, period, tab }: OverviewTabProps) {
  const trafficTotals = useMemo(() => {
    if (!data.trafficOverview?.length) return null;
    const sessions = data.trafficOverview.reduce((sum, r) => sum + r.sessions, 0);
    const users = data.trafficOverview.reduce((sum, r) => sum + r.users, 0);
    const newUsers = data.trafficOverview.reduce((sum, r) => sum + r.newUsers, 0);
    const pageViews = data.trafficOverview.reduce((sum, r) => sum + r.pageViews, 0);
    const orders = data.trafficOverview.reduce((sum, r) => sum + r.orders, 0);
    const convRate = sessions > 0 ? (orders / sessions) * 100 : 0;
    return { sessions, users, newUsers, pageViews, orders, convRate };
  }, [data.trafficOverview]);

  const adsTotals = useMemo(() => {
    if (!data.adsOverview?.length) return null;
    const liveAds = data.adsOverview.filter(r => r.isLive);
    return {
      impressions: liveAds.reduce((sum, r) => sum + r.impressions, 0),
      clicks: liveAds.reduce((sum, r) => sum + r.clicks, 0),
    };
  }, [data.adsOverview]);

  // Use fewer columns when comparison is enabled (cards need more space for delta info)
  const gridCols = comparisonEnabled
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics Grid */}
      <div className={`grid ${gridCols} gap-3 md:gap-4`}>
        {metricsWithDeltas.map((metric) => (
          <MetricCard key={metric.label} metric={metric} comparisonLabel={comparisonLabel} />
        ))}
      </div>

      {/* Comparison Loading Indicator */}
      {comparisonLoading && (
        <div className="text-center text-zinc-500 text-sm animate-pulse">
          Loading comparison data...
        </div>
      )}

      {/* AI Insights */}
      <AIInsights
        currentData={data}
        previousData={previousData}
        metricsWithDeltas={metricsWithDeltas}
        period={period}
        tab={tab}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trend Chart */}
        {data.revenueTrend?.length > 0 && (
          <div className="lg:col-span-8 rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6">
            <SectionHeader title="Revenue Trend (Last 6 Months)" badge="live" />
            <div className="h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} />
                  <YAxis
                    stroke="#71717a"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#18181b',
                      border: '2px solid #3f3f46',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                    }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area type="monotone" dataKey="fireblood" stackId="1" stroke="#FF4757" fill="#FF4757" fillOpacity={0.6} name="Fireblood" />
                  <Area type="monotone" dataKey="topg" stackId="1" stroke="#00E676" fill="#00E676" fillOpacity={0.6} name="Top G" />
                  <Area type="monotone" dataKey="dng" stackId="1" stroke="#AA80FF" fill="#AA80FF" fillOpacity={0.6} name="DNG" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Brand Breakdown Pie */}
        <div className={`${data.revenueTrend?.length > 0 ? 'lg:col-span-4' : 'lg:col-span-12'} rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6`}>
          <SectionHeader title="Brand Breakdown" />
          <div className="h-[200px] md:h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.brandBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.brandBreakdown?.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Traffic Overview Table */}
      {data.trafficOverview?.length > 0 && (
        <div className="rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6">
          <SectionHeader title="Traffic Overview (GA4)" badge="live" />
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-zinc-700">
                  {['Brand', 'Sessions', 'Users', 'New Users', 'Page Views', 'Bounce Rate', 'Avg Duration', 'Orders', 'Conv Rate'].map((header) => (
                    <th key={header} className={`py-3 px-4 text-zinc-400 font-bold text-xs uppercase ${header === 'Brand' ? 'text-left' : 'text-right'}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.trafficOverview.map((row) => (
                  <tr key={row.brand} className="border-b border-zinc-800 table-row-hover">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="font-bold text-white">{row.brand}</span>
                        {row.isLive && <span className="text-xs text-emerald-400 pulse-dot">●</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-white font-bold tabular-nums">{row.sessions.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{row.users.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{row.newUsers.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{row.pageViews.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{row.bounceRate.toFixed(1)}%</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{Math.round(row.avgDuration)}s</td>
                    <td className="py-4 px-4 text-right text-white font-bold tabular-nums">{row.orders.toLocaleString()}</td>
                    <td className={`py-4 px-4 text-right font-bold tabular-nums ${
                      row.convRate >= 2 ? 'text-emerald-400' : row.convRate >= 1 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {row.convRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                {trafficTotals && (
                  <tr className="border-t-2 border-zinc-600 bg-zinc-800/50">
                    <td className="py-4 px-4 font-black text-white">TOTAL</td>
                    <td className="py-4 px-4 text-right text-white font-black tabular-nums">{trafficTotals.sessions.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold tabular-nums">{trafficTotals.users.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold tabular-nums">{trafficTotals.newUsers.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold tabular-nums">{trafficTotals.pageViews.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-300">-</td>
                    <td className="py-4 px-4 text-right text-zinc-300">-</td>
                    <td className="py-4 px-4 text-right text-white font-black tabular-nums">{trafficTotals.orders.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-emerald-400 font-black tabular-nums">{trafficTotals.convRate.toFixed(2)}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Google Ads Table */}
      {data.adsOverview?.some((a) => a.isLive) && (
        <div className="rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6">
          <SectionHeader title="Google Ads Performance (Last 30 Days)" badge="live" />
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b-2 border-zinc-700">
                  {['Account', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'Conversions', 'CPA', 'Conv Value', 'ROAS'].map((header) => (
                    <th key={header} className={`py-3 px-4 text-zinc-400 font-bold text-xs uppercase ${header === 'Account' ? 'text-left' : 'text-right'}`}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.adsOverview.filter((row) => row.isLive).map((row) => (
                  <tr key={row.brand} className="border-b border-zinc-800 table-row-hover">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="font-bold text-white">{row.brand}</span>
                        <span className="text-xs text-blue-400 pulse-dot">●</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-white font-bold tabular-nums">{formatCurrency(row.spend, 2)}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{row.impressions.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{row.clicks.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{row.ctr.toFixed(2)}%</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{formatCurrency(row.cpc, 2)}</td>
                    <td className="py-4 px-4 text-right text-white font-bold tabular-nums">{row.conversions.toFixed(0)}</td>
                    <td className="py-4 px-4 text-right text-zinc-400 tabular-nums">{formatCurrency(row.cpa, 2)}</td>
                    <td className="py-4 px-4 text-right text-emerald-400 font-bold tabular-nums">{formatCurrency(row.conversionValue, 2)}</td>
                    <td className={`py-4 px-4 text-right font-bold tabular-nums ${
                      row.roas >= 3 ? 'text-emerald-400' : row.roas >= 2 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {row.roas.toFixed(2)}x
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                {data.adsSummary && adsTotals && (
                  <tr className="border-t-2 border-zinc-600 bg-zinc-800/50">
                    <td className="py-4 px-4 font-black text-white">TOTAL</td>
                    <td className="py-4 px-4 text-right text-white font-black tabular-nums">{formatCurrency(data.adsSummary.spend, 2)}</td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold tabular-nums">{adsTotals.impressions.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold tabular-nums">{adsTotals.clicks.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-300">-</td>
                    <td className="py-4 px-4 text-right text-zinc-300">-</td>
                    <td className="py-4 px-4 text-right text-white font-black tabular-nums">{data.adsSummary.conversions.toFixed(0)}</td>
                    <td className="py-4 px-4 text-right text-zinc-300 tabular-nums">
                      {data.adsSummary.conversions > 0 ? formatCurrency(data.adsSummary.spend / data.adsSummary.conversions, 2) : '-'}
                    </td>
                    <td className="py-4 px-4 text-right text-emerald-400 font-black tabular-nums">{formatCurrency(data.adsSummary.revenue, 2)}</td>
                    <td className={`py-4 px-4 text-right font-black tabular-nums ${
                      data.adsSummary.roas >= 3 ? 'text-emerald-400' : data.adsSummary.roas >= 2 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {data.adsSummary.roas.toFixed(2)}x
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

interface BrandTabProps {
  data: BrandData;
  brandId: TabId;
  metricsWithDeltas: MetricWithDelta[];
  comparisonLabel?: string;
  comparisonLoading?: boolean;
  comparisonEnabled?: boolean;
  previousData: DashboardData | null;
  period: TimePeriod;
}

const BrandTab = memo(function BrandTab({ data, brandId, metricsWithDeltas, comparisonLabel, comparisonLoading, comparisonEnabled, previousData, period }: BrandTabProps) {
  // Use fewer columns when comparison is enabled (cards need more space for delta info)
  const gridCols = comparisonEnabled
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metrics Grid */}
      <div className={`grid ${gridCols} gap-3 md:gap-4`}>
        {metricsWithDeltas.map((metric) => (
          <MetricCard key={metric.label} metric={metric} comparisonLabel={comparisonLabel} />
        ))}
      </div>

      {/* Comparison Loading Indicator */}
      {comparisonLoading && (
        <div className="text-center text-zinc-500 text-sm animate-pulse">
          Loading comparison data...
        </div>
      )}

      {/* AI Insights */}
      <AIInsights
        currentData={data}
        previousData={previousData}
        metricsWithDeltas={metricsWithDeltas}
        period={period}
        tab={brandId}
      />

      {/* Top Products */}
      {data.topProducts?.length > 0 && (
        <div className="rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6">
          <SectionHeader title="Top Products" badge="live" />
          <ProductList products={data.topProducts} />
        </div>
      )}

      {/* Subscription Metrics (Fireblood only) */}
      {data.subscriptionMetrics && (
        <div className="rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6">
          <SectionHeader title="Subscriptions" badge="live" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="text-sm text-zinc-400">Active Subscribers</div>
              <div className="text-2xl md:text-3xl font-black text-white tabular-nums">
                {data.subscriptionMetrics.activeSubscribers?.toLocaleString() ?? 'N/A'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="text-sm text-zinc-400">MRR</div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 tabular-nums">
                {data.subscriptionMetrics.mrr != null ? formatCurrency(data.subscriptionMetrics.mrr) : 'N/A'}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${
              data.subscriptionMetrics.churnRate && data.subscriptionMetrics.churnRate > 5
                ? 'bg-amber-950/50 border border-amber-500/50'
                : 'bg-zinc-800/50'
            }`}>
              <div className="text-sm text-zinc-400">Monthly Churn</div>
              <div className={`text-2xl md:text-3xl font-black tabular-nums ${
                data.subscriptionMetrics.churnRate && data.subscriptionMetrics.churnRate > 5
                  ? 'text-amber-400'
                  : 'text-white'
              }`}>
                {data.subscriptionMetrics.churnRate != null ? `${data.subscriptionMetrics.churnRate}%` : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acquirer Scorecard (Fireblood only) */}
      {data.acquirerScorecard && data.acquirerScorecard.length > 0 && (
        <div className="rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6">
          <SectionHeader title="Acquirer Readiness Scorecard" badge="calculated" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.acquirerScorecard.map((item) => (
              <div key={item.metric} className={`p-4 rounded-xl border-2 ${getStatusBg(item.status)}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-zinc-400">{item.metric}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    item.isLive ? 'bg-emerald-700/50 text-emerald-200' : 'bg-zinc-700/50 text-zinc-300'
                  }`}>
                    {item.weight}
                  </span>
                </div>
                <div className="text-xl md:text-2xl font-black text-white">{item.current}</div>
                <div className="text-sm text-zinc-400">Target: {item.target}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Stats (DNG only) */}
      {data.emailStats && (
        <div className="rounded-xl bg-zinc-900/80 border-2 border-zinc-800 p-4 md:p-6">
          <SectionHeader title="Email List (Sendlane)" badge="live" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="text-sm text-zinc-400">Total Contacts</div>
              <div className="text-2xl md:text-3xl font-black text-white tabular-nums">
                {data.emailStats.totalContacts?.toLocaleString() ?? 'N/A'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="text-sm text-zinc-400">Active</div>
              <div className="text-2xl md:text-3xl font-black text-emerald-400 tabular-nums">
                {data.emailStats.activeContacts?.toLocaleString() ?? 'N/A'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-zinc-800/50">
              <div className="text-sm text-zinc-400">Unsubscribed</div>
              <div className="text-2xl md:text-3xl font-black text-amber-400 tabular-nums">
                {data.emailStats.unsubscribedContacts?.toLocaleString() ?? 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: '📊', color: '#ffffff' },
  { id: 'fireblood', label: 'Fireblood', icon: '🔥', color: '#FF4757' },
  { id: 'gtop', label: 'Gtop', icon: '👕', color: '#00E676' },
  { id: 'dng', label: 'DNG', icon: '📚', color: '#AA80FF' },
];

const CONNECTED_SYSTEMS = ['GA4', 'WooCommerce', 'Sendlane', 'Google Ads'];

export default function CEOWarRoom() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comparison state
  const [comparisonEnabled, setComparisonEnabled] = useState(true);
  const [comparisonData, setComparisonData] = useState<DashboardData | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Update clock - reduced frequency to every 10 seconds for performance
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data
  const fetchData = useCallback(async (tab: TabId, period: TimePeriod, range: DateRange | null) => {
    setLoading(true);
    setError(null);
    setComparisonData(null);
    try {
      let url = `/api/dashboard?tab=${tab}&period=${period}`;
      if (period === 'custom' && range) {
        url += `&startDate=${format(range.start, 'yyyy-MM-dd')}&endDate=${format(range.end, 'yyyy-MM-dd')}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch comparison data after main data loads
  const fetchComparisonData = useCallback(async () => {
    if (!comparisonEnabled) return;

    setComparisonLoading(true);
    try {
      const currentDates = getPeriodDates(timePeriod, customRange || undefined);
      const previousDates = getPreviousPeriodDates(currentDates, 'previous_period');

      if (!previousDates) {
        setComparisonData(null);
        return;
      }

      const { startDate, endDate } = formatForApi(previousDates);
      const url = `/api/dashboard?tab=${activeTab}&period=custom&startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setComparisonData(json);
    } catch (err) {
      console.error('Failed to fetch comparison data:', err);
      setComparisonData(null);
    } finally {
      setComparisonLoading(false);
    }
  }, [activeTab, timePeriod, customRange, comparisonEnabled]);

  // Fetch data when tab or time period changes
  useEffect(() => {
    fetchData(activeTab, timePeriod, customRange);
  }, [activeTab, timePeriod, customRange, fetchData]);

  // Fetch comparison data after main data loads
  useEffect(() => {
    if (data && comparisonEnabled && !loading) {
      fetchComparisonData();
    }
  }, [data, comparisonEnabled, loading, fetchComparisonData]);

  // Handle time period change
  const handleTimePeriodChange = useCallback((period: TimePeriod, range?: DateRange) => {
    setTimePeriod(period);
    setCustomRange(period === 'custom' && range ? range : null);
  }, []);

  // Handle comparison toggle
  const handleComparisonToggle = useCallback(() => {
    setComparisonEnabled(prev => !prev);
  }, []);

  // Calculate metrics with deltas
  const metricsWithDeltas = useMemo((): MetricWithDelta[] => {
    if (!data || !('metrics' in data) || !data.metrics) return [];

    const currentMetrics = data.metrics;
    const previousMetrics = comparisonData && 'metrics' in comparisonData ? comparisonData.metrics : null;

    return currentMetrics.map((metric, idx) => {
      const prevMetric = previousMetrics?.[idx];
      if (!prevMetric || !comparisonEnabled) {
        return metric as MetricWithDelta;
      }

      const currentVal = parseMetricValue(metric.value);
      const prevVal = parseMetricValue(prevMetric.value);
      const delta = calculateDelta(currentVal, prevVal);

      return {
        ...metric,
        previousValue: prevMetric.value,
        previousRaw: prevVal,
        currentRaw: currentVal,
        deltaPercent: delta.percent,
        deltaAbsolute: delta.absolute,
      } as MetricWithDelta;
    });
  }, [data, comparisonData, comparisonEnabled]);

  // Comparison label for display
  const comparisonLabel = useMemo(() => {
    return getComparisonLabel(timePeriod, comparisonEnabled ? 'previous_period' : 'none');
  }, [timePeriod, comparisonEnabled]);

  // Handle tab change
  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  // Memoized date display
  const dateDisplay = useMemo(() => ({
    date: currentTime.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    time: currentTime.toLocaleTimeString('en-GB'),
  }), [currentTime]);

  // Render content based on active tab
  const renderContent = useCallback(() => {
    if (loading) return <LoadingSkeleton />;

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="text-red-400 text-lg font-bold mb-2">Failed to load data</div>
          <div className="text-zinc-500 text-sm mb-4">{error}</div>
          <button
            onClick={() => fetchData(activeTab, timePeriod, customRange)}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!data) return null;

    if (activeTab === 'overview') {
      return (
        <OverviewTab
          data={data as OverviewData}
          metricsWithDeltas={metricsWithDeltas}
          comparisonLabel={comparisonLabel}
          comparisonLoading={comparisonLoading}
          comparisonEnabled={comparisonEnabled}
          previousData={comparisonData}
          period={timePeriod}
          tab={activeTab}
        />
      );
    }

    return (
      <BrandTab
        data={data as BrandData}
        brandId={activeTab}
        metricsWithDeltas={metricsWithDeltas}
        comparisonLabel={comparisonLabel}
        comparisonLoading={comparisonLoading}
        comparisonEnabled={comparisonEnabled}
        previousData={comparisonData}
        period={timePeriod}
      />
    );
  }, [loading, error, data, activeTab, timePeriod, customRange, fetchData, metricsWithDeltas, comparisonLabel, comparisonLoading, comparisonData, comparisonEnabled]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b-2 border-zinc-800 bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <h1 className="text-xl md:text-2xl font-black">CEO WAR ROOM</h1>
              <span className="hidden md:inline text-zinc-500">|</span>
              <span className="hidden md:inline text-zinc-400">Top Brands Portfolio</span>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-bold text-sm">LIVE</span>
              </div>
              <div className="hidden lg:block text-zinc-400 text-sm">
                {dateDisplay.date}
              </div>
              <div className="text-lg md:text-2xl font-mono font-bold tabular-nums">
                {dateDisplay.time}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation + Time Period Selector */}
      <nav className="border-b-2 border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-[57px] md:top-[65px] z-30">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto hide-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-4 md:px-6 py-3 md:py-4 font-bold text-sm transition-all border-b-4 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-white border-red-500 bg-zinc-800/50'
                      : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/30'
                  }`}
                >
                  <span className="mr-1.5">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Time Period Selector + Comparison Toggle */}
            <div className="py-2 flex-shrink-0 flex items-center gap-2">
              <button
                onClick={handleComparisonToggle}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                  comparisonEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
                title={comparisonEnabled ? 'Comparison enabled' : 'Enable comparison'}
              >
                {comparisonEnabled ? '⟷ Compare ON' : '⟷ Compare'}
              </button>
              <TimePeriodSelector
                value={timePeriod}
                customRange={customRange}
                onChange={handleTimePeriodChange}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 md:px-6 py-4 md:py-6">
        {renderContent()}

        {/* Footer */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-900/80 border-2 border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-white font-semibold text-sm">Connected Systems</span>
            </div>
            {CONNECTED_SYSTEMS.map((system) => (
              <div key={system} className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm">{system}</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
          <div className="text-zinc-400 text-sm">
            Data refreshed: <span className="text-white font-semibold tabular-nums">{dateDisplay.time}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
