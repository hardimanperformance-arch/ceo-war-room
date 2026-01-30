// Fireblood data - pulls from real WooCommerce + GA4 APIs

import { getFirebloodWoo } from '../services/woocommerce';
import { getFirebloodGA4 } from '../services/ga4';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Range',
};

export async function getFirebloodData(period: Period = 'month', dateRange?: DateRange) {
  const woo = getFirebloodWoo();
  const ga4 = getFirebloodGA4();
  
  try {
    const [periodStats, subscriptionStats, ga4Stats, topProducts, churnData] = await Promise.all([
      woo ? woo.getOrderStats(period, dateRange) : null,
      woo ? woo.getSubscriptionStats() : null,
      ga4 ? ga4.getTrafficStats(period, dateRange) : null,
      woo ? woo.getTopProducts(period, dateRange, 10) : null,
      woo ? woo.getChurnData() : null,
    ]);
    
    const dtcRevenue = periodStats ? Math.round(periodStats.revenue) : 0;
    const dtcOrders = periodStats?.orders || 0;
    
    const periodLabel = period === 'custom' && dateRange 
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];
    
    // Calculate conversion rate
    const convRate = ga4Stats && ga4Stats.sessions > 0 
      ? ((dtcOrders / ga4Stats.sessions) * 100).toFixed(2)
      : null;
    
    const metrics = [
      { 
        label: `Revenue (${periodLabel})`, 
        value: periodStats ? `£${dtcRevenue.toLocaleString()}` : 'N/A', 
        change: periodStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!periodStats 
      },
      { 
        label: 'Orders', 
        value: periodStats ? dtcOrders.toLocaleString() : 'N/A', 
        change: periodStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!periodStats 
      },
      { 
        label: 'AOV', 
        value: periodStats ? `£${periodStats.avgOrderValue.toFixed(2)}` : 'N/A', 
        change: periodStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!periodStats 
      },
      { 
        label: 'Sessions', 
        value: ga4Stats ? ga4Stats.sessions.toLocaleString() : 'N/A', 
        change: ga4Stats ? 'LIVE' : 'GA4 not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!ga4Stats 
      },
      { 
        label: 'Conversion Rate', 
        value: convRate ? `${convRate}%` : 'N/A', 
        change: convRate ? 'LIVE' : 'Need GA4', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!convRate 
      },
      { 
        label: 'Bounce Rate', 
        value: ga4Stats ? `${ga4Stats.bounceRate.toFixed(1)}%` : 'N/A', 
        change: ga4Stats ? 'LIVE' : 'GA4 not connected', 
        changeType: 'neutral', 
        status: 'good',
        isLive: !!ga4Stats 
      },
    ];
    
    const subscriptionMetrics = subscriptionStats ? {
      activeSubscribers: subscriptionStats.activeSubscribers,
      mrr: subscriptionStats.mrr,
      churnRate: churnData?.churnRate || null,
      isLive: true,
    } : null;
    
    // Calculate acquirer scorecard metrics from real data
    const totalRevenue = dtcRevenue;
    const subscriptionRevenue = subscriptionStats?.mrr || 0;
    const subscriptionPct = totalRevenue > 0 ? (subscriptionRevenue / totalRevenue) * 100 : 0;
    
    const acquirerScorecard = [
      {
        metric: 'Monthly Churn Rate',
        current: churnData ? `${churnData.churnRate}%` : 'N/A',
        target: '<5%',
        status: churnData ? (churnData.churnRate <= 5 ? 'good' : churnData.churnRate <= 8 ? 'warning' : 'critical') : 'warning',
        weight: 'Critical',
        isLive: !!churnData,
      },
      {
        metric: 'Subscription % of Revenue',
        current: subscriptionStats ? `${Math.round(subscriptionPct)}%` : 'N/A',
        target: '>50%',
        status: subscriptionPct >= 50 ? 'good' : subscriptionPct >= 30 ? 'warning' : 'critical',
        weight: 'Critical',
        isLive: !!subscriptionStats,
      },
      {
        metric: 'Active Subscribers',
        current: subscriptionStats ? subscriptionStats.activeSubscribers.toLocaleString() : 'N/A',
        target: 'Growing',
        status: subscriptionStats ? 'good' : 'warning',
        weight: 'High',
        isLive: !!subscriptionStats,
      },
      {
        metric: 'MRR',
        current: subscriptionStats ? `£${subscriptionStats.mrr.toLocaleString()}` : 'N/A',
        target: 'Growing',
        status: subscriptionStats ? 'good' : 'warning',
        weight: 'High',
        isLive: !!subscriptionStats,
      },
      {
        metric: 'DTC % of Revenue',
        current: '100%',
        target: '>50%',
        status: 'good',
        weight: 'Medium',
        isLive: true,
      },
      {
        metric: 'CAC (Google Ads)',
        current: 'N/A',
        target: 'Need Ads Data',
        status: 'warning',
        weight: 'High',
        isLive: false,
      },
    ];
    
    return {
      metrics,
      topProducts: topProducts || [],
      subscriptionMetrics,
      acquirerScorecard,
      ga4Stats,
      dataSource: 'live',
      period,
      dateRange,
      liveMetrics: {
        dtcRevenue,
        dtcOrders,
        avgOrderValue: periodStats ? Math.round(periodStats.avgOrderValue) : 0,
        subscriptions: subscriptionStats,
        sessions: ga4Stats?.sessions || 0,
        conversionRate: convRate,
      },
    };
  } catch (error) {
    console.error('Error fetching Fireblood data:', error);
    return { 
      metrics: [],
      topProducts: [],
      subscriptionMetrics: null,
      acquirerScorecard: [],
      ga4Stats: null,
      dataSource: 'error', 
      error: String(error), 
      period 
    };
  }
}
