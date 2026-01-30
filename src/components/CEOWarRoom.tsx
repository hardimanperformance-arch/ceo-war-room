'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { format } from 'date-fns';
import TimePeriodSelector from './TimePeriodSelector';

// Types
interface Metric {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  status: 'good' | 'warning' | 'critical';
  color?: string;
}

interface ChannelRevenue {
  channel: string;
  revenue: number;
  orders: number;
  pct: number;
  margin: number;
  growth: string;
}

interface ChannelEconomics {
  channel: string;
  spend?: number;
  sessions?: number;
  revenue: number;
  orders: number;
  convRate: number;
  cac: number;
  roas?: number | string;
  ltv?: number;
  ltvCac?: number | string;
  status: string;
}

interface DateRange {
  start: Date;
  end: Date;
}

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export default function CEOWarRoom() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data when tab or time period changes
  useEffect(() => {
    fetchData(activeTab, timePeriod, customRange);
  }, [activeTab, timePeriod, customRange]);

  const fetchData = async (tab: string, period: TimePeriod, range: DateRange | null) => {
    setLoading(true);
    try {
      let url = `/api/dashboard?tab=${tab}&period=${period}`;
      if (period === 'custom' && range) {
        url += `&startDate=${format(range.start, 'yyyy-MM-dd')}&endDate=${format(range.end, 'yyyy-MM-dd')}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  };

  const handleTimePeriodChange = (period: TimePeriod, range?: DateRange) => {
    setTimePeriod(period);
    if (period === 'custom' && range) {
      setCustomRange(range);
    } else {
      setCustomRange(null);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'fireblood', label: 'Fireblood', icon: '🔥' },
    { id: 'gtop', label: 'Gtop', icon: '👕' },
    { id: 'dng', label: 'DNG', icon: '📚' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': case 'scale': return 'bg-emerald-500';
      case 'warning': case 'watch': case 'fix': return 'bg-amber-500';
      case 'critical': case 'kill': return 'bg-red-500';
      default: return 'bg-zinc-500';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'good': case 'scale': return 'bg-emerald-950 border-emerald-500';
      case 'warning': case 'watch': case 'fix': return 'bg-amber-950 border-amber-500';
      case 'critical': case 'kill': return 'bg-red-950 border-red-500';
      default: return 'bg-zinc-800 border-zinc-600';
    }
  };

  // Render metric card
  const renderMetricCard = (metric: Metric, index: number) => (
    <div key={index} className={`p-4 rounded-xl border-2 ${getStatusBg(metric.status)}`}>
      <div className="text-sm text-zinc-400 mb-1">{metric.label}</div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-black text-white" style={metric.color ? { color: metric.color } : {}}>
          {metric.value}
        </div>
        {metric.change && (
          <div className={`text-sm font-bold ${metric.changeType === 'positive' ? 'text-emerald-400' : metric.changeType === 'negative' ? 'text-red-400' : 'text-zinc-400'}`}>
            {metric.change}
          </div>
        )}
      </div>
    </div>
  );

  // Render Overview Tab
  const renderOverview = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-6 gap-4">
          {data.metrics?.map((metric: Metric, i: number) => renderMetricCard(metric, i))}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Brand Breakdown Pie */}
          <div className="col-span-12 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-black text-white mb-4">Brand Breakdown</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.brandBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.brandBreakdown?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `£${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Overview Panel - GA4 Data */}
        {data.trafficOverview && (
          <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Traffic Overview (GA4)</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-black">LIVE</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-zinc-700">
                    <th className="text-left py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Brand</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Sessions</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Users</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">New Users</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Page Views</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Bounce Rate</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Avg Duration</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Orders</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Conv Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trafficOverview.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-zinc-800">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></div>
                          <span className="font-bold text-white">{row.brand}</span>
                          {row.isLive && <span className="text-xs text-emerald-400">●</span>}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-white font-bold">{row.sessions.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{row.users.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{row.newUsers.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{row.pageViews.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{row.bounceRate.toFixed(1)}%</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{Math.round(row.avgDuration)}s</td>
                      <td className="py-4 px-4 text-right text-white font-bold">{row.orders.toLocaleString()}</td>
                      <td className={`py-4 px-4 text-right font-bold ${row.convRate >= 2 ? 'text-emerald-400' : row.convRate >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                        {row.convRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-zinc-600 bg-zinc-800">
                    <td className="py-4 px-4 font-black text-white">TOTAL</td>
                    <td className="py-4 px-4 text-right text-white font-black">
                      {data.trafficOverview.reduce((sum: number, r: any) => sum + r.sessions, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold">
                      {data.trafficOverview.reduce((sum: number, r: any) => sum + r.users, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold">
                      {data.trafficOverview.reduce((sum: number, r: any) => sum + r.newUsers, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-300 font-bold">
                      {data.trafficOverview.reduce((sum: number, r: any) => sum + r.pageViews, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-zinc-300">-</td>
                    <td className="py-4 px-4 text-right text-zinc-300">-</td>
                    <td className="py-4 px-4 text-right text-white font-black">
                      {data.trafficOverview.reduce((sum: number, r: any) => sum + r.orders, 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right text-emerald-400 font-black">
                      {(() => {
                        const totalSessions = data.trafficOverview.reduce((sum: number, r: any) => sum + r.sessions, 0);
                        const totalOrders = data.trafficOverview.reduce((sum: number, r: any) => sum + r.orders, 0);
                        return totalSessions > 0 ? ((totalOrders / totalSessions) * 100).toFixed(2) : '0.00';
                      })()}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Google Ads Overview Panel */}
        {data.adsOverview && data.adsOverview.some((a: any) => a.isLive) && (
          <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Google Ads Performance (Last 30 Days)</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">LIVE</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-zinc-700">
                    <th className="text-left py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Account</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Spend</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Impressions</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Clicks</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">CTR</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">CPC</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Conversions</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">CPA</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Conv Value</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.adsOverview.filter((row: any) => row.isLive).map((row: any, i: number) => (
                    <tr key={i} className="border-b border-zinc-800">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }}></div>
                          <span className="font-bold text-white">{row.brand}</span>
                          <span className="text-xs text-blue-400">●</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right text-white font-bold">£{row.spend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{row.impressions.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{row.clicks.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">{row.ctr.toFixed(2)}%</td>
                      <td className="py-4 px-4 text-right text-zinc-400">£{row.cpc.toFixed(2)}</td>
                      <td className="py-4 px-4 text-right text-white font-bold">{row.conversions.toFixed(0)}</td>
                      <td className="py-4 px-4 text-right text-zinc-400">£{row.cpa.toFixed(2)}</td>
                      <td className="py-4 px-4 text-right text-emerald-400 font-bold">£{row.conversionValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className={`py-4 px-4 text-right font-bold ${row.roas >= 3 ? 'text-emerald-400' : row.roas >= 2 ? 'text-amber-400' : 'text-red-400'}`}>
                        {row.roas.toFixed(2)}x
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  {data.adsSummary && (
                    <tr className="border-t-2 border-zinc-600 bg-zinc-800">
                      <td className="py-4 px-4 font-black text-white">TOTAL</td>
                      <td className="py-4 px-4 text-right text-white font-black">£{data.adsSummary.spend.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="py-4 px-4 text-right text-zinc-300 font-bold">
                        {data.adsOverview.filter((r: any) => r.isLive).reduce((sum: number, r: any) => sum + r.impressions, 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-zinc-300 font-bold">
                        {data.adsOverview.filter((r: any) => r.isLive).reduce((sum: number, r: any) => sum + r.clicks, 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right text-zinc-300">-</td>
                      <td className="py-4 px-4 text-right text-zinc-300">-</td>
                      <td className="py-4 px-4 text-right text-white font-black">{data.adsSummary.conversions.toFixed(0)}</td>
                      <td className="py-4 px-4 text-right text-zinc-300">£{(data.adsSummary.spend / data.adsSummary.conversions).toFixed(2)}</td>
                      <td className="py-4 px-4 text-right text-emerald-400 font-black">£{data.adsSummary.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className={`py-4 px-4 text-right font-black ${data.adsSummary.roas >= 3 ? 'text-emerald-400' : data.adsSummary.roas >= 2 ? 'text-amber-400' : 'text-red-400'}`}>
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
  };

  // Render Fireblood Tab
  const renderFireblood = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-6 gap-4">
          {data.metrics?.map((metric: Metric, i: number) => renderMetricCard(metric, i))}
        </div>

        {/* Top Products */}
        {data.topProducts && data.topProducts.length > 0 && (
          <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Top Products</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-black">LIVE</span>
            </div>
            <div className="space-y-3">
              {data.topProducts.map((product: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{product.name}</span>
                    <span className="text-emerald-400 font-bold">£{product.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-zinc-400">{product.units} units sold</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription Metrics */}
        {data.subscriptionMetrics && (
          <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Subscriptions</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-black">LIVE</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-zinc-800">
                <div className="text-sm text-zinc-400">Active Subscribers</div>
                <div className="text-3xl font-black text-white">{data.subscriptionMetrics.activeSubscribers?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800">
                <div className="text-sm text-zinc-400">MRR</div>
                <div className="text-3xl font-black text-emerald-400">£{data.subscriptionMetrics.mrr?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Gtop Tab
  const renderGtop = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-6 gap-4">
          {data.metrics?.map((metric: Metric, i: number) => renderMetricCard(metric, i))}
        </div>

        {/* Top Products */}
        {data.topProducts && data.topProducts.length > 0 && (
          <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Top Products</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-black">LIVE</span>
            </div>
            <div className="space-y-3">
              {data.topProducts.map((product: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{product.name}</span>
                    <span className="text-emerald-400 font-bold">£{product.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-400 mt-1">
                    <span>{product.units} units sold</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render DNG Tab
  const renderDng = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-6 gap-4">
          {data.metrics?.map((metric: Metric, i: number) => renderMetricCard(metric, i))}
        </div>

        {/* Top Products */}
        {data.topProducts && data.topProducts.length > 0 && (
          <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Top Products</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-black">LIVE</span>
            </div>
            <div className="space-y-3">
              {data.topProducts.map((product: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{product.name}</span>
                    <span className="text-emerald-400 font-bold">£{product.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-400 mt-1">
                    <span>{product.units} units sold</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Stats */}
        {data.emailStats && (
          <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-white">Email List (Sendlane)</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-black">LIVE</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-zinc-800">
                <div className="text-sm text-zinc-400">Total Contacts</div>
                <div className="text-3xl font-black text-white">{data.emailStats.totalContacts?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800">
                <div className="text-sm text-zinc-400">Active</div>
                <div className="text-3xl font-black text-emerald-400">{data.emailStats.activeContacts?.toLocaleString() || 'N/A'}</div>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800">
                <div className="text-sm text-zinc-400">Unsubscribed</div>
                <div className="text-3xl font-black text-amber-400">{data.emailStats.unsubscribedContacts?.toLocaleString() || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b-2 border-zinc-800 bg-zinc-900">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black">🎯 CEO WAR ROOM</h1>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-400">Top Brands Portfolio</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-bold text-sm">LIVE</span>
              </div>
              <div className="text-zinc-400">
                {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString('en-GB')}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation + Time Period Selector */}
      <nav className="border-b-2 border-zinc-800 bg-zinc-900/50">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-bold text-sm transition-all border-b-4 ${
                    activeTab === tab.id
                      ? 'text-white border-red-500 bg-zinc-800/50'
                      : 'text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/30'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Time Period Selector */}
            <div className="py-2">
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
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-zinc-400">Loading data...</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'fireblood' && renderFireblood()}
            {activeTab === 'gtop' && renderGtop()}
            {activeTab === 'dng' && renderDng()}
          </>
        )}

        {/* Footer */}
        <div className="mt-6 p-4 rounded-xl bg-zinc-900 border-2 border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-white font-semibold text-sm">Connected Systems</span>
            </div>
            {['GA4', 'WooCommerce', 'Sendlane', 'Google Ads'].map((system) => (
              <div key={system} className="flex items-center gap-2">
                <span className="text-zinc-400 text-sm">{system}</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
          <div className="text-zinc-400 text-sm">
            Data refreshed: <span className="text-white font-semibold">{currentTime.toLocaleTimeString('en-GB')}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
