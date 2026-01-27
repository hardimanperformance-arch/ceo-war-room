// Gtop data - pulls from real WooCommerce API when configured

import { getTopgWoo } from '../services/woocommerce';

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
    { channel: 'Direct', sessions: 28400, revenue: 38200, orders: 712, convRate: 2.51, cac: 0, status: 'scale' },
    { channel: 'Instagram', sessions: 24800, revenue: 28600, orders: 548, convRate: 2.21, cac: 0, status: 'scale' },
    { channel: 'TikTok', sessions: 18200, revenue: 16400, orders: 298, convRate: 1.64, cac: 0, status: 'watch' },
    { channel: 'Twitter/X', sessions: 8400, revenue: 8200, orders: 156, convRate: 1.86, cac: 0, status: 'good' },
    { channel: 'Google Organic', sessions: 5200, revenue: 4800, orders: 89, convRate: 1.71, cac: 0, status: 'good' },
    { channel: 'YouTube', sessions: 2952, revenue: 2220, orders: 44, convRate: 1.49, cac: 0, status: 'watch' },
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

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Range',
};

export async function getGtopData(period: Period = 'month', dateRange?: DateRange) {
  const woo = getTopgWoo();
  
  if (!woo) {
    console.log('Using mock Gtop data - WooCommerce not configured');
    return { ...mockData, dataSource: 'mock', period };
  }
  
  try {
    const periodStats = await woo.getOrderStats(period, dateRange);
    
    const periodLabel = period === 'custom' && dateRange 
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];
    
    const realMetrics: Metric[] = [
      { label: `Revenue (${periodLabel})`, value: `£${periodStats.revenue.toLocaleString()}`, change: 'LIVE', changeType: 'positive', status: 'good', isLive: true },
      { label: 'Orders', value: periodStats.orders.toLocaleString(), change: 'LIVE', changeType: 'positive', status: 'good', isLive: true },
      { label: 'AOV', value: `£${periodStats.avgOrderValue.toFixed(2)}`, change: 'LIVE', changeType: 'positive', status: 'good', isLive: true },
      ...mockData.metrics.slice(3).map(m => ({ ...m, isLive: false })),
    ];
    
    return {
      metrics: realMetrics,
      channelEconomics: mockData.channelEconomics,
      trafficTrend: mockData.trafficTrend,
      topProducts: mockData.topProducts,
      dataSource: 'live',
      period,
      dateRange,
      liveMetrics: {
        revenue: periodStats.revenue,
        orders: periodStats.orders,
        avgOrderValue: periodStats.avgOrderValue,
      },
    };
  } catch (error) {
    console.error('Error fetching Gtop data:', error);
    return { ...mockData, dataSource: 'mock', error: String(error), period };
  }
}
