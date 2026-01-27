// Fireblood data - pulls from real WooCommerce API when configured

import { getFirebloodWoo } from '../services/woocommerce';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

const mockData = {
  channelRevenue: [
    { channel: 'DTC Website', revenue: 498506, orders: 5540, pct: 70, margin: 68, growth: '+12%' },
    { channel: 'TikTok Shop UK', revenue: 89200, orders: 1240, pct: 12.5, margin: 42, growth: '+84%' },
    { channel: 'TikTok Shop USA', revenue: 52800, orders: 680, pct: 7.4, margin: 38, growth: '+156%' },
    { channel: 'Amazon UK', revenue: 48320, orders: 620, pct: 6.8, margin: 32, growth: '+8%' },
    { channel: 'Amazon USA', revenue: 23328, orders: 263, pct: 3.3, margin: 28, growth: '+22%' },
  ],
  channelEconomics: [
    { channel: 'Google Ads', spend: 42000, revenue: 88588, orders: 1203, convRate: 1.88, cac: 34.91, roas: 2.11, ltv: 156, ltvCac: 4.5, status: 'scale' },
    { channel: 'Direct', spend: 0, revenue: 58625, orders: 832, convRate: 2.39, cac: 0, roas: '∞', ltv: 168, ltvCac: '∞', status: 'scale' },
    { channel: 'TikTok Organic', spend: 0, revenue: 142000, orders: 1920, convRate: 3.2, cac: 0, roas: '∞', ltv: 134, ltvCac: '∞', status: 'scale' },
    { channel: 'Twitter/X', spend: 0, revenue: 19415, orders: 291, convRate: 0.86, cac: 0, roas: '∞', ltv: 124, ltvCac: '∞', status: 'watch' },
    { channel: 'Instagram', spend: 8500, revenue: 12280, orders: 188, convRate: 0.66, cac: 45.21, roas: 1.44, ltv: 99, ltvCac: 2.2, status: 'fix' },
    { channel: 'Affiliates', spend: 5800, revenue: 11650, orders: 150, convRate: 2.56, cac: 38.67, roas: 2.01, ltv: 189, ltvCac: 4.9, status: 'scale' },
    { channel: 'Facebook Ads', spend: 6200, revenue: 2362, orders: 36, convRate: 0.41, cac: 172.22, roas: 0.38, ltv: 113, ltvCac: 0.7, status: 'kill' },
  ],
  subscriptionMetrics: {
    activeSubscribers: 1847,
    subscriberChange: 124,
    mrr: 142650,
    mrrChange: 8.4,
    churnRate: 6.8,
    churnTarget: 5.0,
    avgLifetime: 8.2,
    subscriptionPct: 38,
    subscriberLTV: 312,
    oneTimeLTV: 89,
    failedPayments: 42,
    recovered: 8,
    recoveryRate: 19,
  },
  subscriptionTrends: [
    { month: 'Jul', subscribers: 1420, mrr: 108340, churn: 5.2 },
    { month: 'Aug', subscribers: 1512, mrr: 115420, churn: 5.8 },
    { month: 'Sep', subscribers: 1598, mrr: 122080, churn: 6.1 },
    { month: 'Oct', subscribers: 1678, mrr: 128240, churn: 6.4 },
    { month: 'Nov', subscribers: 1723, mrr: 131560, churn: 7.2 },
    { month: 'Dec', subscribers: 1847, mrr: 142650, churn: 6.8 },
  ],
  acquirerScorecard: [
    { metric: 'Monthly Churn Rate', current: '6.8%', target: '<5%', status: 'warning', weight: 'Critical' },
    { metric: 'Subscription % of Revenue', current: '38%', target: '>50%', status: 'warning', weight: 'Critical' },
    { metric: 'Failed Payment Recovery', current: '19%', target: '>40%', status: 'critical', weight: 'High' },
    { metric: 'LTV:CAC Ratio', current: '7.8:1', target: '>3:1', status: 'good', weight: 'Critical' },
    { metric: 'Channel Diversification', current: '5 channels', target: '>3', status: 'good', weight: 'High' },
    { metric: 'DTC % of Revenue', current: '70%', target: '>50%', status: 'good', weight: 'Medium' },
  ],
};

export async function getFirebloodData(period: Period = 'month', dateRange?: DateRange) {
  const woo = getFirebloodWoo();
  
  if (!woo) {
    console.log('Using mock Fireblood data - WooCommerce not configured');
    return { ...mockData, dataSource: 'mock', period };
  }
  
  try {
    const [periodStats, subscriptionStats] = await Promise.all([
      woo.getOrderStats(period, dateRange),
      woo.getSubscriptionStats(),
    ]);
    
    const dtcRevenue = Math.round(periodStats.revenue);
    const dtcOrders = periodStats.orders;
    
    const realChannelRevenue = [
      { 
        channel: 'DTC Website', 
        revenue: dtcRevenue, 
        orders: dtcOrders, 
        pct: 100,
        margin: 68, 
        growth: 'LIVE',
        isLive: true 
      },
      ...mockData.channelRevenue.slice(1).map(c => ({ ...c, isLive: false })),
    ];
    
    const realSubscriptionMetrics = subscriptionStats ? {
      ...mockData.subscriptionMetrics,
      activeSubscribers: subscriptionStats.activeSubscribers,
      mrr: subscriptionStats.mrr,
      isLive: true,
    } : { ...mockData.subscriptionMetrics, isLive: false };
    
    return {
      channelRevenue: realChannelRevenue,
      channelEconomics: mockData.channelEconomics,
      subscriptionMetrics: realSubscriptionMetrics,
      subscriptionTrends: mockData.subscriptionTrends,
      acquirerScorecard: mockData.acquirerScorecard,
      dataSource: 'live',
      period,
      dateRange,
      liveMetrics: {
        dtcRevenue: dtcRevenue,
        dtcOrders: dtcOrders,
        avgOrderValue: Math.round(periodStats.avgOrderValue),
        subscriptions: subscriptionStats,
      },
    };
  } catch (error) {
    console.error('Error fetching Fireblood data:', error);
    return { ...mockData, dataSource: 'mock', error: String(error), period };
  }
}
