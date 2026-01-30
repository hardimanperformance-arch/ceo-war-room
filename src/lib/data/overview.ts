// Overview data - aggregates from all brands with live WooCommerce + GA4 + Google Ads data

import { getFirebloodWoo, getTopgWoo, getDngWoo } from '../services/woocommerce';
import { getFirebloodGA4, getTopgGA4, getDngGA4 } from '../services/ga4';
import { getGoogleAdsSheetService } from '../services/googleads-sheet';

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

export async function getOverviewData(period: Period = 'month', dateRange?: DateRange) {
  const firebloodWoo = getFirebloodWoo();
  const topgWoo = getTopgWoo();
  const dngWoo = getDngWoo();
  const firebloodGA4 = getFirebloodGA4();
  const topgGA4 = getTopgGA4();
  const dngGA4 = getDngGA4();
  const adsService = getGoogleAdsSheetService();
  
  try {
    // Fetch current period stats
    const [
      firebloodStats, topgStats, dngStats,
      fbGA4, topgGA4Stats, dngGA4Stats,
      firebloodAds, topgAds
    ] = await Promise.all([
      firebloodWoo ? firebloodWoo.getOrderStats(period, dateRange) : null,
      topgWoo ? topgWoo.getOrderStats(period, dateRange) : null,
      dngWoo ? dngWoo.getOrderStats(period, dateRange) : null,
      firebloodGA4 ? firebloodGA4.getTrafficStats(period, dateRange).catch(() => null) : null,
      topgGA4 ? topgGA4.getTrafficStats(period, dateRange).catch(() => null) : null,
      dngGA4 ? dngGA4.getTrafficStats(period, dateRange).catch(() => null) : null,
      adsService ? adsService.getAccountSummary('Fireblood').catch(() => null) : null,
      adsService ? adsService.getAccountSummary('TopG').catch(() => null) : null,
    ]);
    
    // Fetch monthly historical data for revenue trend (last 6 months)
    const [fbMonthly, topgMonthly, dngMonthly] = await Promise.all([
      firebloodWoo ? firebloodWoo.getMonthlyRevenue(6).catch(() => []) : [],
      topgWoo ? topgWoo.getMonthlyRevenue(6).catch(() => []) : [],
      dngWoo ? dngWoo.getMonthlyRevenue(6).catch(() => []) : [],
    ]);
    
    // Build revenue trend data
    const revenueTrend = fbMonthly.map((fb, i) => ({
      month: fb.month,
      fireblood: fb.revenue,
      topg: topgMonthly[i]?.revenue || 0,
      dng: dngMonthly[i]?.revenue || 0,
      total: fb.revenue + (topgMonthly[i]?.revenue || 0) + (dngMonthly[i]?.revenue || 0),
    }));
    
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

    const periodLabel = period === 'custom' && dateRange 
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];
    
    // Calculate blended conversion rate
    const conversionRate = totalSessions > 0 
      ? ((totalOrders / totalSessions) * 100).toFixed(2)
      : null;
    
    const metrics = [
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
        label: 'Top G Revenue', 
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
        label: 'Total Orders', 
        value: totalOrders.toLocaleString(), 
        change: 'LIVE', 
        changeType: 'positive', 
        status: 'good',
        isLive: true 
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
    
    const brandBreakdown = [
      { name: 'Fireblood', value: Math.round(fbRev), color: '#FF4757', isLive: !!firebloodStats },
      { name: 'Top G', value: Math.round(topgRev), color: '#00E676', isLive: !!topgStats },
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
    
    // Google Ads Overview
    const adsOverview = [
      {
        brand: 'Fireblood',
        color: '#FF4757',
        impressions: firebloodAds?.impressions || 0,
        clicks: firebloodAds?.clicks || 0,
        spend: firebloodAds?.spend || 0,
        conversions: firebloodAds?.conversions || 0,
        conversionValue: firebloodAds?.conversionValue || 0,
        ctr: firebloodAds?.ctr || 0,
        cpc: firebloodAds?.avgCpc || 0,
        cpa: firebloodAds?.cpa || 0,
        roas: firebloodAds?.roas || 0,
        isLive: !!firebloodAds,
      },
      {
        brand: 'Top G',
        color: '#00E676',
        impressions: topgAds?.impressions || 0,
        clicks: topgAds?.clicks || 0,
        spend: topgAds?.spend || 0,
        conversions: topgAds?.conversions || 0,
        conversionValue: topgAds?.conversionValue || 0,
        ctr: topgAds?.ctr || 0,
        cpc: topgAds?.avgCpc || 0,
        cpa: topgAds?.cpa || 0,
        roas: topgAds?.roas || 0,
        isLive: !!topgAds,
      },
    ];
    
    const totalAdSpend = (firebloodAds?.spend || 0) + (topgAds?.spend || 0);
    const totalAdConversions = (firebloodAds?.conversions || 0) + (topgAds?.conversions || 0);
    const totalAdRevenue = (firebloodAds?.conversionValue || 0) + (topgAds?.conversionValue || 0);
    const blendedRoas = totalAdSpend > 0 ? totalAdRevenue / totalAdSpend : 0;
    
    return {
      metrics,
      brandBreakdown,
      revenueTrend,
      trafficOverview,
      adsOverview,
      adsSummary: { spend: totalAdSpend, conversions: totalAdConversions, revenue: totalAdRevenue, roas: blendedRoas },
      dataSource: 'live',
      period,
      dateRange,
    };
  } catch (error) {
    console.error('Error fetching overview data:', error);
    return { 
      metrics: [],
      brandBreakdown: [],
      revenueTrend: [],
      trafficOverview: [],
      adsOverview: [],
      adsSummary: null,
      dataSource: 'error', 
      error: String(error), 
      period 
    };
  }
}
