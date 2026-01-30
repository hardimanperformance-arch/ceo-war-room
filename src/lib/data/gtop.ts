// Gtop data - pulls from real WooCommerce + GA4 APIs when configured

import { getTopgWoo } from '../services/woocommerce';
import { getTopgGA4 } from '../services/ga4';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

interface Metric {
  label: string;
  value: string;
  change: string;
  changeType: string;
  status: string;
  isLive?: boolean;
}

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Range',
};

const mockData = {
  metrics: [
    { label: 'Monthly Revenue', value: '£98,420', change: '+3.1%', changeType: 'positive', status: 'warning' },
    { label: 'Orders', value: '1,847', change: '+124', changeType: 'positive', status: 'good' },
    { label: 'AOV', value: '£53.28', change: '-£2.40', changeType: 'negative', status: 'warning' },
    { label: 'Conversion Rate', value: '2.1%', change: '+0.3%', changeType: 'positive', status: 'good' },
    { label: 'Sessions', value: '87,952', change: '-8.2%', changeType: 'negative', status: 'warning' },
    { label: 'Returning Customers', value: '34%', change: '+2%', changeType: 'positive', status: 'good' },
  ] as Metric[],
  channelEconomics: [
    { channel: 'Direct', spend: 0, revenue: 38200, orders: 712, convRate: 2.51, cac: 0, roas: '∞', ltv: 120, ltvCac: '∞', status: 'scale' },
    { channel: 'Instagram', spend: 0, revenue: 28600, orders: 548, convRate: 2.21, cac: 0, roas: '∞', ltv: 115, ltvCac: '∞', status: 'scale' },
    { channel: 'TikTok', spend: 0, revenue: 16400, orders: 298, convRate: 1.64, cac: 0, roas: '∞', ltv: 108, ltvCac: '∞', status: 'watch' },
    { channel: 'Twitter/X', spend: 0, revenue: 8200, orders: 156, convRate: 1.86, cac: 0, roas: '∞', ltv: 95, ltvCac: '∞', status: 'good' },
    { channel: 'Google Organic', spend: 0, revenue: 4800, orders: 89, convRate: 1.71, cac: 0, roas: '∞', ltv: 102, ltvCac: '∞', status: 'good' },
    { channel: 'YouTube', spend: 0, revenue: 2220, orders: 44, convRate: 1.49, cac: 0, roas: '∞', ltv: 88, ltvCac: '∞', status: 'watch' },
  ],
  trafficTrend: [
    { month: 'Jul', sessions: 102000, orders: 2100, revenue: 112800 },
    { month: 'Aug', sessions: 98000, orders: 1980, revenue: 106400 },
    { month: 'Sep', sessions: 94000, orders: 1920, revenue: 102800 },
    { month: 'Oct', sessions: 92000, orders: 1890, revenue: 101200 },
    { month: 'Nov', sessions: 90000, orders: 1860, revenue: 99800 },
    { month: 'Dec', sessions: 87952, orders: 1847, revenue: 98420 },
  ],
  topProducts: [
    { name: 'Classic Logo Tee', revenue: 18400, units: 612, stock: 284 },
    { name: 'Hustle Hoodie', revenue: 14200, units: 284, stock: 89 },
    { name: 'Premium Cap', revenue: 9800, units: 490, stock: 342 },
    { name: 'Motivation Crewneck', revenue: 8600, units: 172, stock: 56 },
    { name: 'Limited Edition Jacket', revenue: 7200, units: 48, stock: 12 },
  ],
};

export async function getGtopData(period: Period = 'month', dateRange?: DateRange) {
  const woo = getTopgWoo();
  const ga4 = getTopgGA4();
  
  if (!woo && !ga4) {
    console.log('Using mock Gtop data - APIs not configured');
    return { ...mockData, dataSource: 'mock', period };
  }
  
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
    
    const realMetrics: Metric[] = [
      { label: `Revenue (${periodLabel})`, value: `£${Math.round(revenue).toLocaleString()}`, change: periodStats ? 'LIVE' : 'N/A', changeType: 'positive', status: 'good', isLive: !!periodStats },
      { label: 'Orders', value: orders.toLocaleString(), change: periodStats ? 'LIVE' : 'N/A', changeType: 'positive', status: 'good', isLive: !!periodStats },
      { label: 'AOV', value: periodStats ? `£${periodStats.avgOrderValue.toFixed(2)}` : 'N/A', change: periodStats ? 'LIVE' : 'N/A', changeType: 'positive', status: 'good', isLive: !!periodStats },
      { label: 'Conversion Rate', value: `${convRate}%`, change: ga4Stats ? 'LIVE' : 'N/A', changeType: 'positive', status: 'good', isLive: !!ga4Stats },
      { label: 'Sessions', value: sessions.toLocaleString(), change: ga4Stats ? 'LIVE' : 'N/A', changeType: 'positive', status: 'good', isLive: !!ga4Stats },
      { label: 'Bounce Rate', value: ga4Stats ? `${ga4Stats.bounceRate.toFixed(1)}%` : 'N/A', change: ga4Stats ? 'LIVE' : 'N/A', changeType: 'neutral', status: 'good', isLive: !!ga4Stats },
    ];
    
    return {
      metrics: realMetrics,
      channelEconomics: mockData.channelEconomics,
      trafficTrend: mockData.trafficTrend,
      topProducts: topProducts && topProducts.length > 0 ? topProducts : mockData.topProducts,
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
    console.error('Error fetching Gtop data:', error);
    return { ...mockData, dataSource: 'mock', error: String(error), period };
  }
}
