'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ComposedChart
} from 'recharts';

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

type TimePeriod = 'today' | 'week' | 'month' | 'year';

export default function CEOWarRoom() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch data when tab or time period changes
  useEffect(() => {
    fetchData(activeTab, timePeriod);
  }, [activeTab, timePeriod]);

  const fetchData = async (tab: string, period: TimePeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?tab=${tab}&period=${period}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setLoading(false);
  };

  const brands = {
    fireblood: { name: 'Fireblood', color: '#FF4757', icon: '🔥' },
    gtop: { name: 'Gtop', color: '#00E676', icon: '👕' },
    dng: { name: 'DNG', color: '#AA80FF', icon: '📚' }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'fireblood', label: 'Fireblood', icon: '🔥' },
    { id: 'gtop', label: 'Gtop', icon: '👕' },
    { id: 'dng', label: 'DNG', icon: '📚' },
  ];

  const timePeriods: { id: TimePeriod; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
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
          {/* Revenue Trend Chart */}
          <div className="col-span-8 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-black text-white mb-4">Revenue Trend (All Brands)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '2px solid #3f3f46', borderRadius: '12px' }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="fireblood" stackId="1" stroke="#FF4757" fill="#FF4757" fillOpacity={0.6} name="Fireblood" />
                <Area type="monotone" dataKey="gtop" stackId="1" stroke="#00E676" fill="#00E676" fillOpacity={0.6} name="Gtop" />
                <Area type="monotone" dataKey="dng" stackId="1" stroke="#AA80FF" fill="#AA80FF" fillOpacity={0.6} name="DNG" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Brand Breakdown Pie */}
          <div className="col-span-4 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
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
      </div>
    );
  };

  // Render Fireblood Tab
  const renderFireblood = () => {
    if (!data) return null;
    return (
      <div className="space-y-6">
        {/* Channel Revenue */}
        <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
          <h2 className="text-xl font-black text-white mb-4">Channel Revenue</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-zinc-700">
                  <th className="text-left py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Channel</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Revenue</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Orders</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">% Total</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Margin</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Growth</th>
                </tr>
              </thead>
              <tbody>
                {data.channelRevenue?.map((ch: ChannelRevenue, i: number) => (
                  <tr key={i} className="border-b border-zinc-800">
                    <td className="py-4 px-4 font-bold text-white">{ch.channel}</td>
                    <td className="py-4 px-4 text-right text-white font-bold">£{ch.revenue.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400">{ch.orders.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400">{ch.pct}%</td>
                    <td className="py-4 px-4 text-right text-zinc-400">{ch.margin}%</td>
                    <td className={`py-4 px-4 text-right font-bold ${ch.growth.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{ch.growth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Channel Economics */}
        <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
          <h2 className="text-xl font-black text-white mb-4">Channel Economics</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-zinc-700">
                  <th className="text-left py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Channel</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Spend</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Revenue</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">CAC</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">ROAS</th>
                  <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">LTV:CAC</th>
                  <th className="text-center py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.channelEconomics?.map((ch: ChannelEconomics, i: number) => (
                  <tr key={i} className="border-b border-zinc-800">
                    <td className="py-4 px-4 font-bold text-white">{ch.channel}</td>
                    <td className="py-4 px-4 text-right text-zinc-400">{ch.spend ? `£${ch.spend.toLocaleString()}` : '-'}</td>
                    <td className="py-4 px-4 text-right text-white font-bold">£{ch.revenue.toLocaleString()}</td>
                    <td className="py-4 px-4 text-right text-zinc-400">{ch.cac ? `£${ch.cac.toFixed(2)}` : '-'}</td>
                    <td className="py-4 px-4 text-right text-zinc-400">{ch.roas}</td>
                    <td className="py-4 px-4 text-right text-zinc-400">{ch.ltvCac}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ch.status === 'scale' ? 'bg-emerald-500 text-black' :
                        ch.status === 'watch' ? 'bg-amber-500 text-black' :
                        ch.status === 'fix' ? 'bg-orange-500 text-black' :
                        'bg-red-500 text-white'
                      }`}>
                        {ch.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Metrics */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-black text-white mb-4">Subscriptions</h2>
            {data.subscriptionMetrics && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-zinc-800">
                  <div className="text-sm text-zinc-400">Active Subscribers</div>
                  <div className="text-3xl font-black text-white">{data.subscriptionMetrics.activeSubscribers.toLocaleString()}</div>
                  <div className="text-emerald-400 text-sm">+{data.subscriptionMetrics.subscriberChange} this month</div>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800">
                  <div className="text-sm text-zinc-400">MRR</div>
                  <div className="text-3xl font-black text-emerald-400">£{data.subscriptionMetrics.mrr.toLocaleString()}</div>
                  <div className="text-emerald-400 text-sm">+{data.subscriptionMetrics.mrrChange}% growth</div>
                </div>
                <div className="p-4 rounded-lg bg-amber-950 border border-amber-500">
                  <div className="text-sm text-zinc-400">Churn Rate</div>
                  <div className="text-3xl font-black text-amber-400">{data.subscriptionMetrics.churnRate}%</div>
                  <div className="text-amber-400 text-sm">Target: {data.subscriptionMetrics.churnTarget}%</div>
                </div>
              </div>
            )}
          </div>

          {/* Subscription Chart */}
          <div className="col-span-8 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-black text-white mb-4">Subscription Trends</h2>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.subscriptionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis yAxisId="left" stroke="#888" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '2px solid #3f3f46', borderRadius: '12px' }} />
                <Bar yAxisId="left" dataKey="mrr" fill="#10b981" opacity={0.8} radius={[4, 4, 0, 0]} name="MRR (£)" />
                <Line yAxisId="right" type="monotone" dataKey="churn" stroke="#f59e0b" strokeWidth={3} name="Churn %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acquirer Scorecard */}
        <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
          <h2 className="text-xl font-black text-white mb-4">🎯 Acquirer Readiness Scorecard</h2>
          <div className="grid grid-cols-3 gap-4">
            {data.acquirerScorecard?.map((item: any, i: number) => (
              <div key={i} className={`p-4 rounded-xl border-2 ${getStatusBg(item.status)}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-zinc-400">{item.metric}</span>
                  <span className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300">{item.weight}</span>
                </div>
                <div className="text-2xl font-black text-white">{item.current}</div>
                <div className="text-sm text-zinc-400">Target: {item.target}</div>
              </div>
            ))}
          </div>
        </div>
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

        <div className="grid grid-cols-12 gap-6">
          {/* Traffic Trend */}
          <div className="col-span-8 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-black text-white mb-4">Traffic & Revenue Trend</h2>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.trafficTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis yAxisId="left" stroke="#888" fontSize={12} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '2px solid #3f3f46', borderRadius: '12px' }} />
                <Bar yAxisId="left" dataKey="sessions" fill="#00E676" opacity={0.6} name="Sessions" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#fff" strokeWidth={3} name="Revenue" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 rounded-lg bg-amber-950 border border-amber-500">
              <p className="text-amber-400 font-bold text-sm">⚠️ Traffic declining 8.2% MoM. Investigate Instagram reach drop.</p>
            </div>
          </div>

          {/* Top Products */}
          <div className="col-span-4 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-black text-white mb-4">Top Products</h2>
            <div className="space-y-3">
              {data.topProducts?.map((product: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{product.name}</span>
                    <span className="text-emerald-400 font-bold">£{product.revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-400 mt-1">
                    <span>{product.units} units</span>
                    <span className={product.stock < 100 ? 'text-amber-400' : ''}>Stock: {product.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Channel Performance */}
        <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
          <h2 className="text-xl font-black text-white mb-4">Channel Performance</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-zinc-700">
                <th className="text-left py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Channel</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Sessions</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Revenue</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Orders</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Conv Rate</th>
                <th className="text-center py-3 px-4 text-zinc-400 font-bold text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.channelEconomics?.map((ch: ChannelEconomics, i: number) => (
                <tr key={i} className="border-b border-zinc-800">
                  <td className="py-4 px-4 font-bold text-white">{ch.channel}</td>
                  <td className="py-4 px-4 text-right text-zinc-400">{ch.sessions?.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right text-white font-bold">£{ch.revenue.toLocaleString()}</td>
                  <td className="py-4 px-4 text-right text-zinc-400">{ch.orders}</td>
                  <td className="py-4 px-4 text-right text-zinc-400">{ch.convRate}%</td>
                  <td className="py-4 px-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(ch.status)} text-black`}>
                      {ch.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

        <div className="grid grid-cols-12 gap-6">
          {/* Launch Performance */}
          <div className="col-span-8 space-y-6">
            <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-black text-white mb-6">Launch Performance</h2>
              <div className="space-y-4">
                {data.launches?.map((launch: any, i: number) => (
                  <div key={i} className={`p-4 rounded-xl border-2 ${launch.status === 'upcoming' ? 'border-purple-500 bg-purple-950/30' : 'border-zinc-700 bg-zinc-800'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-lg">{launch.name}</span>
                          {launch.status === 'upcoming' && <span className="px-2 py-1 rounded bg-purple-500 text-white text-xs font-bold">UPCOMING</span>}
                        </div>
                        <div className="text-sm text-zinc-400 mt-1">{launch.date}</div>
                      </div>
                      <div className="text-right">
                        {launch.status === 'upcoming' ? (
                          <>
                            <div className="text-2xl font-black text-purple-400">{launch.preorders.toLocaleString()}</div>
                            <div className="text-sm text-zinc-400">pre-orders / {launch.target.toLocaleString()} target</div>
                            <div className="w-32 h-2 bg-zinc-700 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(launch.preorders / launch.target) * 100}%` }} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-2xl font-black text-white">£{launch.revenue.toLocaleString()}</div>
                            <div className="text-sm text-emerald-400 font-bold">{launch.sellThrough}% sell-through</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* List Growth Chart */}
            <div className="rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
              <h2 className="text-xl font-black text-white mb-6">Email List Growth</h2>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data.listGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '2px solid #3f3f46', borderRadius: '12px' }} />
                  <Bar dataKey="newSubs" fill="#AA80FF" opacity={0.8} radius={[4, 4, 0, 0]} name="New Subscribers" />
                  <Line type="monotone" dataKey="listSize" stroke="#10b981" strokeWidth={3} name="Total List Size" />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 rounded-lg bg-emerald-950 border border-emerald-500">
                <p className="text-emerald-400 font-bold text-sm">✓ List growing +6.9% MoM. December spike likely from holiday content push.</p>
              </div>
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="col-span-4 rounded-xl bg-zinc-900 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-black text-white mb-4">List Building Sources</h2>
            <div className="space-y-3">
              {data.trafficSources?.map((source: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{source.channel}</span>
                    <span className={`font-bold ${source.convRate >= 4 ? 'text-emerald-400' : source.convRate >= 3 ? 'text-white' : 'text-amber-400'}`}>
                      {source.convRate}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-400 mt-1">
                    <span>{source.sessions.toLocaleString()} sessions</span>
                    <span>{source.signups} signups</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg p-1">
              {timePeriods.map((period) => (
                <button
                  key={period.id}
                  onClick={() => setTimePeriod(period.id)}
                  className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${
                    timePeriod === period.id
                      ? 'bg-red-500 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {period.label}
                </button>
              ))}
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
              <span className="text-white font-semibold text-sm">All systems operational</span>
            </div>
            {['GA4', 'WooCommerce', 'TikTok Shop', 'Amazon SP-API', 'Sendlane'].map((system) => (
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
