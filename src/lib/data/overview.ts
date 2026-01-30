// Overview data - aggregates from all brands with live WooCommerce + GA4 + Google Ads data

import { getFirebloodWoo, getTopgWoo, getDngWoo } from '../services/woocommerce';
import { getFirebloodGA4, getTopgGA4, getDngGA4 } from '../services/ga4';
import { getGoogleSheetsAdsService } from '../services/googlesheets-ads';

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
      firebloodGA4 ? firebloodGA4.getTrafficStats(period, dateRange).catch(() => null) : null,
      topgGA4 ? topgGA4.getTrafficStats(period, dateRange).catch(() => null) : null,
      dngGA4 ? dngGA4.getTrafficStats(period, dateRange).catch(() => null) : null,
    ]);
    
    const fbRev = firebloodStats?.revenue || 0;
    const topgRev = topgStats?.revenue || 0;
    const dngRev = dngStats?.revenue || 0;
    const totalRev = fbRev + topgRev + dngRev;
    
    const fbOrders = firebloodStats?.orders || 0;
    const topgOrders = topgStats?.orders || 0;
    const dngOrders = dngStats?.orders || 0;
    const totalOrders = fbOrders + topgOrders + dngOrders;
    
    // GA4 traffic data
    const fbSessions = fbGA4?.sessions || 0;
    const topgSessions = topgGA4Stats?.sessions || 0;
    const dngSessions = dngGA4Stats?.sessions || 0;
    const totalSessions = fbSessions + topgSessions + dngSessions;
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
        value: `£${Math.round(totalRev).toLocaleString()}`, 
        change: 'LIVE', 
        changeType: 'positive', 
        status: 'good',
        isLive: true 
      },
      { 
        label: 'Fireblood Revenue', 
        value: firebloodStats ? `£${Math.round(fbRev).toLocaleString()}` : 'N/A', 
        change: firebloodStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: firebloodStats ? 'good' : 'warning', 
        color: '#FF4757',
        isLive: !!firebloodStats 
      },
      { 
        label: 'Gtop Revenue', 
        value: topgStats ? `£${Math.round(topgRev).toLocaleString()}` : 'N/A', 
        change: topgStats ? 'LIVE' : 'Not connected', 
        changeType: 'positive', 
        status: topgStats ? 'good' : 'warning', 
        color: '#00E676',
        isLive: !!topgStats 
      },
      { 
        label: 'DNG Revenue', 
        value: dngStats ? `£${Math.round(dngRev).toLocaleString()}` : 'N/A', 
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
      { name: 'Fireblood', value: Math.round(fbRev), color: '#FF4757', isLive: !!firebloodStats },
      { name: 'Gtop', value: Math.round(topgRev), color: '#00E676', isLive: !!topgStats },
      { name: 'DNG', value: Math.round(dngRev), color: '#AA80FF', isLive: !!dngStats },
    ];
    
    // Traffic Overview by Brand (GA4 data)
    const trafficOverview = [
      { 
        brand: 'Fireblood', 
        color: '#FF4757',
        sessions: fbSessions,
        users: fbGA4?.totalUsers || 0,
        newUsers: fbGA4?.newUsers || 0,
        bounceRate: fbGA4?.bounceRate || 0,
        avgDuration: fbGA4?.avgSessionDuration || 0,
        pageViews: fbGA4?.pageViews || 0,
        orders: fbOrders,
        convRate: fbSessions > 0 ? ((fbOrders / fbSessions) * 100) : 0,
        isLive: !!fbGA4,
      },
      { 
        brand: 'Top G', 
        color: '#00E676',
        sessions: topgSessions,
        users: topgGA4Stats?.totalUsers || 0,
        newUsers: topgGA4Stats?.newUsers || 0,
        bounceRate: topgGA4Stats?.bounceRate || 0,
        avgDuration: topgGA4Stats?.avgSessionDuration || 0,
        pageViews: topgGA4Stats?.pageViews || 0,
        orders: topgOrders,
        convRate: topgSessions > 0 ? ((topgOrders / topgSessions) * 100) : 0,
        isLive: !!topgGA4Stats,
      },
      { 
        brand: 'DNG', 
        color: '#AA80FF',
        sessions: dngSessions,
        users: dngGA4Stats?.totalUsers || 0,
        newUsers: dngGA4Stats?.newUsers || 0,
        bounceRate: dngGA4Stats?.bounceRate || 0,
        avgDuration: dngGA4Stats?.avgSessionDuration || 0,
        pageViews: dngGA4Stats?.pageViews || 0,
        orders: dngOrders,
        convRate: dngSessions > 0 ? ((dngOrders / dngSessions) * 100) : 0,
        isLive: !!dngGA4Stats,
      },
    ];
    
    // Traffic breakdown for pie chart
    const trafficBreakdown = [
      { name: 'Fireblood', value: fbSessions, color: '#FF4757' },
      { name: 'Top G', value: topgSessions, color: '#00E676' },
      { name: 'DNG', value: dngSessions, color: '#AA80FF' },
    ];
    
    return {
      metrics: realMetrics,
      revenueTrend: mockData.revenueTrend,
      brandBreakdown: realBrandBreakdown,
      trafficOverview,
      trafficBreakdown,
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
