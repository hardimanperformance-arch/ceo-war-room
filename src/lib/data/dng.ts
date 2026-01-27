// DNG Comics data - pulls from real WooCommerce and Sendlane APIs when configured

import { getDngWoo } from '../services/woocommerce';
import { getSendlane } from '../services/sendlane';

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
    { label: 'YTD Revenue', value: '£36,656', change: '-12.4%', changeType: 'negative', status: 'warning' },
    { label: 'Email List Size', value: '28,492', change: '+1,847', changeType: 'positive', status: 'good' },
    { label: 'List Growth Rate', value: '+6.9%', change: '+0.8%', changeType: 'positive', status: 'good' },
    { label: 'Avg Open Rate', value: '42.3%', change: '+2.1%', changeType: 'positive', status: 'good' },
    { label: 'Last Launch Revenue', value: '£18,240', change: '', changeType: 'neutral', status: 'good' },
    { label: 'Avg Launch Revenue', value: '£12,218', change: '+18%', changeType: 'positive', status: 'good' },
  ] as Metric[],
  launches: [
    { name: 'Issue #7: Reckoning', date: 'Feb 2025', status: 'upcoming', preorders: 847, target: 1200 },
    { name: 'Issue #6: Shadows', date: 'Oct 2024', revenue: 18240, sellThrough: 92, status: 'completed' },
    { name: 'Holiday Bundle', date: 'Dec 2024', revenue: 8420, sellThrough: 78, status: 'completed' },
    { name: 'Issue #5: Origins', date: 'Jul 2024', revenue: 14200, sellThrough: 88, status: 'completed' },
  ],
  listGrowth: [
    { month: 'Jul', newSubs: 892, listSize: 24200 },
    { month: 'Aug', newSubs: 1045, listSize: 25245 },
    { month: 'Sep', newSubs: 780, listSize: 26025 },
    { month: 'Oct', newSubs: 920, listSize: 26945 },
    { month: 'Nov', newSubs: 300, listSize: 27245 },
    { month: 'Dec', newSubs: 1247, listSize: 28492 },
  ],
  trafficSources: [
    { channel: 'TikTok', sessions: 12400, signups: 620, convRate: 5.0 },
    { channel: 'Twitter/X', sessions: 8200, signups: 328, convRate: 4.0 },
    { channel: 'Instagram', sessions: 6800, signups: 238, convRate: 3.5 },
    { channel: 'YouTube', sessions: 4200, signups: 147, convRate: 3.5 },
    { channel: 'Direct', sessions: 3800, signups: 114, convRate: 3.0 },
    { channel: 'Reddit', sessions: 2400, signups: 48, convRate: 2.0 },
  ],
};

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Range',
};

export async function getDngData(period: Period = 'month', dateRange?: DateRange) {
  const woo = getDngWoo();
  const sendlane = getSendlane();
  
  if (!woo && !sendlane) {
    console.log('Using mock DNG data - APIs not configured');
    return { ...mockData, dataSource: 'mock', period };
  }
  
  try {
    const [wooStats, sendlaneStats] = await Promise.all([
      woo ? woo.getOrderStats(period, dateRange) : null,
      sendlane ? sendlane.getTotalSubscribers() : null,
    ]);
    
    const realMetrics: Metric[] = [...mockData.metrics];
    
    const periodLabel = period === 'custom' && dateRange 
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];
    
    if (wooStats) {
      realMetrics[0] = { 
        label: `Revenue (${periodLabel})`, 
        value: `£${wooStats.revenue.toLocaleString()}`, 
        change: 'LIVE', 
        changeType: 'positive', 
        status: 'good',
        isLive: true 
      };
    }
    
    if (sendlaneStats) {
      realMetrics[1] = { 
        label: 'Email List Size', 
        value: sendlaneStats.totalSubscribers.toLocaleString(), 
        change: 'LIVE', 
        changeType: 'positive', 
        status: 'good',
        isLive: true 
      };
    }
    
    return {
      metrics: realMetrics,
      launches: mockData.launches,
      listGrowth: mockData.listGrowth,
      trafficSources: mockData.trafficSources,
      dataSource: wooStats || sendlaneStats ? 'live' : 'mock',
      period,
      dateRange,
      liveMetrics: {
        revenue: wooStats?.revenue,
        orders: wooStats?.orders,
        totalSubscribers: sendlaneStats?.totalSubscribers,
        lists: sendlaneStats?.lists,
      },
    };
  } catch (error) {
    console.error('Error fetching DNG data:', error);
    return { ...mockData, dataSource: 'mock', error: String(error), period };
  }
}
