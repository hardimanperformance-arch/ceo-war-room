// Fireblood+ data - Consolidated brand view combining:
// 1. Fireblood store (all orders)
// 2. Top G store (Fireblood-branded products only)
// This gives the true Fireblood brand performance for acquirer readiness

import { getFirebloodWoo, getTopgWoo } from '../services/woocommerce';
import { getFirebloodGA4 } from '../services/ga4';
import { getGoogleAdsSheetService } from '../services/googleads-sheet';
import { getPeriodDates, formatForApi } from '../utils/period';
import type { TimePeriod } from '../../types/dashboard';

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

// Filter string to identify Fireblood products on Top G store
const FIREBLOOD_FILTER = 'fireblood';

export async function getFirebloodPlusData(period: Period = 'month', dateRange?: DateRange) {
  const firebloodWoo = getFirebloodWoo();
  const topgWoo = getTopgWoo();
  const ga4 = getFirebloodGA4();
  const adsService = getGoogleAdsSheetService();

  // Calculate consistent date range (use start/end format for WooCommerce)
  const customRange: DateRange = dateRange
    ? dateRange
    : (() => {
        const periodDates = getPeriodDates(period as TimePeriod);
        const apiDates = formatForApi(periodDates);
        return { start: apiDates.startDate, end: apiDates.endDate };
      })();

  console.log('[Fireblood+] Fetching data for range:', customRange);

  try {
    console.log('[Fireblood+] Services available:', {
      firebloodWoo: !!firebloodWoo,
      topgWoo: !!topgWoo,
      ga4: !!ga4,
      adsService: !!adsService,
    });

    const [
      // Fireblood store - full stats
      firebloodStats,
      firebloodTopProducts,
      subscriptionStats,
      churnData,
      // Top G store - Fireblood products only
      topgFirebloodStats,
      // GA4 (Fireblood site only)
      ga4Stats,
      // Google Ads
      adsData,
    ] = await Promise.all([
      firebloodWoo?.getOrderStats('custom', customRange) ?? null,
      firebloodWoo?.getTopProducts('custom', customRange, 10) ?? null,
      firebloodWoo?.getSubscriptionStats() ?? null,
      firebloodWoo?.getChurnData() ?? null,
      topgWoo?.getOrderStatsByProductName('custom', customRange, FIREBLOOD_FILTER) ?? null,
      ga4?.getTrafficStats('custom', customRange) ?? null,
      adsService?.getAccountSummary('Fireblood').catch((e) => { console.error('[Fireblood+] Ads error:', e); return null; }) ?? null,
    ]);

    console.log('[Fireblood+] Data fetched:', {
      firebloodStats: !!firebloodStats,
      subscriptionStats: !!subscriptionStats,
      churnData: !!churnData,
      topgFirebloodStats: !!topgFirebloodStats,
      adsData: !!adsData,
    });

    // Combine revenue from both sources
    const firebloodRevenue = firebloodStats?.revenue || 0;
    const topgFirebloodRevenue = topgFirebloodStats?.revenue || 0;
    const totalRevenue = firebloodRevenue + topgFirebloodRevenue;

    // Combine orders
    const firebloodOrders = firebloodStats?.orders || 0;
    const topgFirebloodOrders = topgFirebloodStats?.orders || 0;
    const totalOrders = firebloodOrders + topgFirebloodOrders;

    // Combined AOV
    const combinedAOV = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Combine top products
    const topgProducts = topgFirebloodStats?.matchingProducts || [];
    const fbProducts = firebloodTopProducts || [];

    // Merge products by name
    const productMap = new Map<string, { revenue: number; units: number; source: string }>();

    for (const p of fbProducts) {
      productMap.set(p.name, { revenue: p.revenue, units: p.units, source: 'fireblood.com' });
    }

    for (const p of topgProducts) {
      const existing = productMap.get(p.name);
      if (existing) {
        existing.revenue += p.revenue;
        existing.units += p.units;
        existing.source = 'both';
      } else {
        productMap.set(p.name, { revenue: p.revenue, units: p.units, source: 'merch.topg.com' });
      }
    }

    const combinedTopProducts = Array.from(productMap.entries())
      .map(([name, data]) => ({ name, revenue: data.revenue, units: data.units, source: data.source }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const periodLabel = period === 'custom' && dateRange
      ? `${dateRange.start} - ${dateRange.end}`
      : periodLabels[period];

    // Calculate conversion rate (Fireblood site traffic only)
    const sessions = ga4Stats?.sessions || 0;
    const users = ga4Stats?.totalUsers || 0;
    const convRate = users > 0 ? ((totalOrders / users) * 100).toFixed(2) : null;

    const metrics = [
      {
        label: `Combined Revenue (${periodLabel})`,
        value: `£${Math.round(totalRevenue).toLocaleString()}`,
        change: 'LIVE',
        changeType: 'positive',
        status: 'good',
        isLive: true,
      },
      {
        label: 'Fireblood.com Revenue',
        value: `£${Math.round(firebloodRevenue).toLocaleString()}`,
        change: firebloodStats ? 'LIVE' : 'Not connected',
        changeType: 'positive',
        status: firebloodStats ? 'good' : 'warning',
        color: '#FF4757',
        isLive: !!firebloodStats,
      },
      {
        label: 'Top G (Fireblood)',
        value: `£${Math.round(topgFirebloodRevenue).toLocaleString()}`,
        change: topgFirebloodStats ? 'LIVE' : 'Not connected',
        changeType: 'positive',
        status: topgFirebloodStats ? 'good' : 'warning',
        color: '#00E676',
        isLive: !!topgFirebloodStats,
      },
      {
        label: 'Total Orders',
        value: totalOrders.toLocaleString(),
        change: 'LIVE',
        changeType: 'positive',
        status: 'good',
        isLive: true,
      },
      {
        label: 'Combined AOV',
        value: `£${combinedAOV.toFixed(2)}`,
        change: 'LIVE',
        changeType: 'positive',
        status: 'good',
        isLive: true,
      },
      {
        label: 'Conversion Rate',
        value: convRate ? `${convRate}%` : 'N/A',
        change: convRate ? 'LIVE' : 'Need GA4',
        changeType: 'positive',
        status: convRate ? 'good' : 'warning',
        isLive: !!convRate,
      },
    ];

    // Subscription metrics (from Fireblood store only)
    const subscriptionMetrics = subscriptionStats ? {
      activeSubscribers: subscriptionStats.activeSubscribers,
      mrr: subscriptionStats.mrr,
      churnRate: churnData?.churnRate || null,
      isLive: true,
    } : null;

    // === ACQUIRER READINESS SCORECARD ===
    // Uses combined revenue for more accurate picture

    const subscriptionRevenue = subscriptionStats?.mrr || 0;
    const subscriptionPct = totalRevenue > 0 ? (subscriptionRevenue / totalRevenue) * 100 : 0;

    // CAC from Google Ads
    const cac = adsData?.cpa || null;

    // LTV estimate: Combined AOV * 2.5 (average repeat factor)
    const estimatedLtv = combinedAOV * 2.5;
    const ltvCacRatio = cac && cac > 0 ? estimatedLtv / cac : null;

    // ROAS from Google Ads
    const roas = adsData?.roas || null;

    // DTC % calculation (Fireblood.com is DTC, Top G merch is also DTC)
    const dtcPct = 100; // Both channels are DTC

    const acquirerScorecard = [
      {
        metric: 'Monthly Churn Rate',
        current: churnData ? `${churnData.churnRate}%` : 'N/A',
        target: '<5%',
        status: churnData ? (churnData.churnRate <= 5 ? 'good' : churnData.churnRate <= 8 ? 'warning' : 'critical') : 'warning',
        weight: 'Critical',
        isLive: !!churnData,
      },
      {
        metric: 'Subscription % of Revenue',
        current: subscriptionStats ? `${Math.round(subscriptionPct)}%` : 'N/A',
        target: '>50%',
        status: subscriptionPct >= 50 ? 'good' : subscriptionPct >= 30 ? 'warning' : 'critical',
        weight: 'Critical',
        isLive: !!subscriptionStats,
      },
      {
        metric: 'CAC (Google Ads)',
        current: cac ? `£${cac.toFixed(2)}` : 'N/A',
        target: '<£40',
        status: cac ? (cac <= 40 ? 'good' : cac <= 60 ? 'warning' : 'critical') : 'warning',
        weight: 'High',
        isLive: !!cac,
      },
      {
        metric: 'LTV:CAC Ratio',
        current: ltvCacRatio ? `${ltvCacRatio.toFixed(1)}:1` : 'N/A',
        target: '>3:1',
        status: ltvCacRatio ? (ltvCacRatio >= 3 ? 'good' : ltvCacRatio >= 2 ? 'warning' : 'critical') : 'warning',
        weight: 'Critical',
        isLive: !!ltvCacRatio,
      },
      {
        metric: 'ROAS (Google Ads)',
        current: roas ? `${roas.toFixed(2)}x` : 'N/A',
        target: '>2x',
        status: roas ? (roas >= 2 ? 'good' : roas >= 1.5 ? 'warning' : 'critical') : 'warning',
        weight: 'High',
        isLive: !!roas,
      },
      {
        metric: 'DTC % of Revenue',
        current: `${dtcPct}%`,
        target: '>50%',
        status: 'good',
        weight: 'Medium',
        isLive: true,
      },
    ];

    // Revenue breakdown for visualization
    const revenueBreakdown = [
      { source: 'Fireblood.com', value: firebloodRevenue, color: '#FF4757' },
      { source: 'Top G (Fireblood)', value: topgFirebloodRevenue, color: '#00E676' },
    ];

    console.log('[Fireblood+] Scorecard built:', {
      scorecardLength: acquirerScorecard.length,
      scorecard: acquirerScorecard.map(s => ({ metric: s.metric, current: s.current, status: s.status })),
    });

    return {
      metrics,
      topProducts: combinedTopProducts,
      subscriptionMetrics,
      acquirerScorecard,
      revenueBreakdown,
      ga4Stats,
      dataSource: 'live',
      period,
      dateRange,
      // Summary for AI insights
      consolidatedSummary: {
        totalRevenue,
        firebloodRevenue,
        topgFirebloodRevenue,
        topgContributionPct: totalRevenue > 0 ? (topgFirebloodRevenue / totalRevenue) * 100 : 0,
        totalOrders,
        combinedAOV,
      },
    };
  } catch (error) {
    console.error('Error fetching Fireblood+ data:', error);
    return {
      metrics: [],
      topProducts: [],
      subscriptionMetrics: null,
      acquirerScorecard: [],
      revenueBreakdown: [],
      ga4Stats: null,
      dataSource: 'error',
      error: String(error),
      period,
    };
  }
}
