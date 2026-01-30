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
    const [periodStats, subscriptionStats, ga4Stats, topProducts] = await Promise.all([
      woo ? woo.getOrderStats(period, dateRange) : null,
      woo ? woo.getSubscriptionStats() : null,
      ga4 ? ga4.getTrafficStats(period, dateRange) : null,
      woo ? woo.getTopProducts(period, dateRange, 10) : null,
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
      isLive: true,
    } : null;
    
    return {
      metrics,
      topProducts: topProducts || [],
      subscriptionMetrics,
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
      ga4Stats: null,
      dataSource: 'error', 
      error: String(error), 
      period 
    };
  }
}
