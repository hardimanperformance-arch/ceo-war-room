// DNG data - pulls from real WooCommerce + GA4 + Sendlane APIs

import { getDngWoo } from '../services/woocommerce';
import { getDngGA4 } from '../services/ga4';
import { getSendlane } from '../services/sendlane';

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

export async function getDngData(period: Period = 'month', dateRange?: DateRange) {
  const woo = getDngWoo();
  const ga4 = getDngGA4();
  const sendlane = getSendlane();
  
  try {
    const [wooStats, ga4Stats, sendlaneStats, topProducts] = await Promise.all([
      woo ? woo.getOrderStats(period, dateRange) : null,
      ga4 ? ga4.getTrafficStats(period, dateRange).catch(() => null) : null,
      sendlane ? sendlane.getListStats().catch(() => null) : null,
      woo ? woo.getTopProducts(period, dateRange, 10) : null,
    ]);
    
    const periodLabel = period === 'custom' && dateRange 
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];
    
    const revenue = wooStats?.revenue || 0;
    const orders = wooStats?.orders || 0;
    const sessions = ga4Stats?.sessions || 0;
    const convRate = sessions > 0 ? ((orders / sessions) * 100).toFixed(2) : '0';
    
    const metrics = [
      { 
        label: `Revenue (${periodLabel})`, 
        value: wooStats ? `£${Math.round(revenue).toLocaleString()}` : 'N/A', 
        change: wooStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!wooStats 
      },
      { 
        label: 'Orders', 
        value: wooStats ? orders.toLocaleString() : 'N/A', 
        change: wooStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!wooStats 
      },
      { 
        label: 'AOV', 
        value: wooStats ? `£${wooStats.avgOrderValue.toFixed(2)}` : 'N/A', 
        change: wooStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!wooStats 
      },
      { 
        label: 'Email List Size', 
        value: sendlaneStats ? sendlaneStats.totalContacts.toLocaleString() : 'N/A', 
        change: sendlaneStats ? 'LIVE' : 'Sendlane not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!sendlaneStats 
      },
      { 
        label: 'Sessions', 
        value: ga4Stats ? sessions.toLocaleString() : 'N/A', 
        change: ga4Stats ? 'LIVE' : 'GA4 not connected', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!ga4Stats 
      },
      { 
        label: 'Conversion Rate', 
        value: `${convRate}%`, 
        change: ga4Stats ? 'LIVE' : 'Need GA4', 
        changeType: 'positive', 
        status: 'good',
        isLive: !!ga4Stats 
      },
    ];
    
    return {
      metrics,
      topProducts: topProducts || [],
      emailStats: sendlaneStats,
      ga4Stats,
      dataSource: 'live',
      period,
      dateRange,
      liveMetrics: {
        revenue,
        orders,
        avgOrderValue: wooStats?.avgOrderValue || 0,
        sessions,
        conversionRate: convRate,
        emailListSize: sendlaneStats?.totalContacts || 0,
      },
    };
  } catch (error) {
    console.error('Error fetching DNG data:', error);
    return { 
      metrics: [],
      topProducts: [],
      emailStats: null,
      ga4Stats: null,
      dataSource: 'error', 
      error: String(error), 
      period 
    };
  }
}
