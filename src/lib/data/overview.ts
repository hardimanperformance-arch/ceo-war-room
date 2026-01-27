// Overview data - aggregates from all brands with live WooCommerce + GA4 data

import { getFirebloodWoo, getTopgWoo, getDngWoo } from '../services/woocommerce';
import { getFirebloodGA4, getTopgGA4, getDngGA4 } from '../services/ga4';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

const mockData = {
  metrics: [
    { label: 'Total Revenue (All Brands)', value: '£847,230', change: '+6.8%', changeType: 'positive', status: 'good' },
    { label: 'Fireblood Revenue', value: '£712,154', change: '+8.2%', changeType: 'positive', status: 'good', color: '#FF4757' },
    { label: 'Gtop Revenue', value: '£98,420', change: '+3.1%', changeType: 'positive', status: 'warning', color: '#00E676' },
    { label: 'DNG Revenue', value: '£36,656', change: '-12.4%', changeType: 'negative', status: 'warning', color: '#AA80FF' },
    { label: 'Total Customers', value: '14,892', change: '+892', changeType: 'positive', status: 'good' },
    { label: 'Blended CAC', value: '£16.40', change: '+£1.80', changeType: 'negative', status: 'warning' },
  ],
  revenueTrend: [
    { month: 'Jul', fireblood: 580000, gtop: 112800, dng: 8200, total: 701000 },
    { month: 'Aug', fireblood: 612000, gtop: 106400, dng: 6800, total: 725200 },
    { month: 'Sep', fireblood: 645000, gtop: 102800, dng: 7400, total: 755200 },
    { month: 'Oct', fireblood: 668000, gtop: 101200, dng: 18240, total: 787440 },
    { month: 'Nov', fireblood: 690000, gtop: 99800, dng: 5200, total: 795000 },
    { month: 'Dec', fireblood: 712154, gtop: 98420, dng: 36656, total: 847230 },
  ],
  brandBreakdown: [
    { name: 'Fireblood', value: 712154, color: '#FF4757' },
    { name: 'Gtop', value: 98420, color: '#00E676' },
    { name: 'DNG', value: 36656, color: '#AA80FF' },
  ],
};

const periodLabels: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  custom: 'Custom Range',
};

export async function getOverviewData(period: Period = 'month', dateRange?: DateRange) {
  const firebloodWoo = getFirebloodWoo();
  const topgWoo = getTopgWoo();
  const dngWoo = getDngWoo();
  const firebloodGA4 = getFirebloodGA4();
  const topgGA4 = getTopgGA4();
  const dngGA4 = getDngGA4();
  
  const hasAnyApi = firebloodWoo || topgWoo || dngWoo || firebloodGA4 || topgGA4 || dngGA4;
  
  if (!hasAnyApi) {
    console.log('Using mock overview data - no APIs configured');
    return { ...mockData, dataSource: 'mock', period };
  }
  
  try {
    const [
      firebloodStats, topgStats, dngStats,
      fbGA4, topgGA4Stats, dngGA4Stats
    ] = await Promise.all([
      firebloodWoo ? firebloodWoo.getOrderStats(period, dateRange) : null,
      topgWoo ? topgWoo.getOrderStats(period, dateRange) : null,
      dngWoo ? dngWoo.getOrderStats(period, dateRange) : null,
      firebloodGA4 ? firebloodGA4.getTrafficStats(period, dateRange) : null,
      topgGA4 ? topgGA4.getTrafficStats(period, dateRange) : null,
      dngGA4 ? dngGA4.getTrafficStats(period, dateRange) : null,
    ]);
    
    const fbRev = firebloodStats?.revenue || 0;
    const topgRev = topgStats?.revenue || 0;
    const dngRev = dngStats?.revenue || 0;
    const totalRev = fbRev + topgRev + dngRev;
    
    const fbOrders = firebloodStats?.orders || 0;
    const topgOrders = topgStats?.orders || 0;
    const dngOrders = dngStats?.orders || 0;
    const totalOrders = fbOrders + topgOrders + dngOrders;
    
    // Aggregate sessions from all GA4 properties
    const totalSessions = (fbGA4?.sessions || 0) + (topgGA4Stats?.sessions || 0) + (dngGA4Stats?.sessions || 0);
    const hasGA4 = fbGA4 || topgGA4Stats || dngGA4Stats;
    
    const periodLabel = period === 'custom' && dateRange 
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];
    
    // Calculate blended conversion rate
    const conversionRate = hasGA4 && totalSessions > 0 
      ? ((totalOrders / totalSessions) * 100).toFixed(2)
      : null;
    
    const realMetrics = [
      { 
        label: `Total Revenue (${periodLabel})`, 
        value: `£${totalRev.toLocaleString()}`, 
        change: 'LIVE', 
        changeType: 'positive', 
        status: 'good',
        isLive: true 
      },
      { 
        label: 'Fireblood Revenue', 
        value: firebloodStats ? `£${fbRev.toLocaleString()}` : 'N/A', 
        change: firebloodStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: firebloodStats ? 'good' : 'warning', 
        color: '#FF4757',
        isLive: !!firebloodStats 
      },
      { 
        label: 'Gtop Revenue', 
        value: topgStats ? `£${topgRev.toLocaleString()}` : 'N/A', 
        change: topgStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: topgStats ? 'good' : 'warning', 
        color: '#00E676',
        isLive: !!topgStats 
      },
      { 
        label: 'DNG Revenue', 
        value: dngStats ? `£${dngRev.toLocaleString()}` : 'N/A', 
        change: dngStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: dngStats ? 'good' : 'warning', 
        color: '#AA80FF',
        isLive: !!dngStats 
      },
      { 
        label: 'Total Sessions', 
        value: hasGA4 ? totalSessions.toLocaleString() : 'N/A', 
        change: hasGA4 ? 'LIVE' : 'GA4 not connected', 
        changeType: 'positive', 
        status: hasGA4 ? 'good' : 'warning',
        isLive: !!hasGA4 
      },
      { 
        label: 'Blended Conv Rate', 
        value: conversionRate ? `${conversionRate}%` : 'N/A', 
        change: conversionRate ? 'LIVE' : 'Need GA4', 
        changeType: 'positive', 
        status: conversionRate ? 'good' : 'warning',
        isLive: !!conversionRate 
      },
    ];
    
    const realBrandBreakdown = [
      { name: 'Fireblood', value: fbRev, color: '#FF4757', isLive: !!firebloodStats },
      { name: 'Gtop', value: topgRev, color: '#00E676', isLive: !!topgStats },
      { name: 'DNG', value: dngRev, color: '#AA80FF', isLive: !!dngStats },
    ];
    
    return {
      metrics: realMetrics,
      revenueTrend: mockData.revenueTrend,
      brandBreakdown: realBrandBreakdown,
      dataSource: 'live',
      period,
      dateRange,
      liveMetrics: {
        fireblood: { woo: firebloodStats, ga4: fbGA4 },
        topg: { woo: topgStats, ga4: topgGA4Stats },
        dng: { woo: dngStats, ga4: dngGA4Stats },
        total: { revenue: totalRev, orders: totalOrders, sessions: totalSessions },
      },
    };
  } catch (error) {
    console.error('Error fetching overview data:', error);
    return { ...mockData, dataSource: 'mock', error: String(error), period };
  }
}
