// Top G data - pulls from real WooCommerce + GA4 APIs

import { getTopgWoo } from '../services/woocommerce';
import { getTopgGA4 } from '../services/ga4';

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

export async function getGtopData(period: Period = 'month', dateRange?: DateRange) {
  const woo = getTopgWoo();
  const ga4 = getTopgGA4();
  
  try {
    const [periodStats, ga4Stats, topProducts] = await Promise.all([
      woo ? woo.getOrderStats(period, dateRange) : null,
      ga4 ? ga4.getTrafficStats(period, dateRange) : null,
      woo ? woo.getTopProducts(period, dateRange, 10) : null,
    ]);
    
    const periodLabel = period === 'custom' && dateRange 
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];
    
    const revenue = periodStats?.revenue || 0;
    const orders = periodStats?.orders || 0;
    const sessions = ga4Stats?.sessions || 0;
    const convRate = sessions > 0 ? ((orders / sessions) * 100).toFixed(2) : '0';
    
    const metrics = [
      { 
        label: `Revenue (${periodLabel})`, 
        value: periodStats ? `£${Math.round(revenue).toLocaleString()}` : 'N/A', 
        change: periodStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: 'good', 
        isLive: !!periodStats 
      },
      { 
        label: 'Orders', 
        value: periodStats ? orders.toLocaleString() : 'N/A', 
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
        label: 'Conversion Rate', 
        value: `${convRate}%`, 
        change: ga4Stats ? 'LIVE' : 'Need GA4', 
        changeType: 'positive', 
        status: 'good', 
        isLive: !!ga4Stats 
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
        label: 'Bounce Rate', 
        value: ga4Stats ? `${ga4Stats.bounceRate.toFixed(1)}%` : 'N/A', 
        change: ga4Stats ? 'LIVE' : 'GA4 not connected', 
        changeType: 'neutral', 
        status: 'good', 
        isLive: !!ga4Stats 
      },
    ];
    
    return {
      metrics,
      topProducts: topProducts || [],
      ga4Stats,
      dataSource: 'live',
      period,
      dateRange,
      liveMetrics: {
        revenue,
        orders,
        avgOrderValue: periodStats?.avgOrderValue || 0,
        sessions,
        conversionRate: convRate,
      },
    };
  } catch (error) {
    console.error('Error fetching Top G data:', error);
    return { 
      metrics: [],
      topProducts: [],
      ga4Stats: null,
      dataSource: 'error', 
      error: String(error), 
      period 
    };
  }
}
