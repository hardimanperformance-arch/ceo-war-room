import { NextResponse } from 'next/server';
import { getFirebloodWoo, getTopgWoo, getDngWoo } from '@/lib/services/woocommerce';
import { getOverviewData } from '@/lib/data/overview';

export async function GET() {
  const firebloodWoo = getFirebloodWoo();
  const topgWoo = getTopgWoo();
  const dngWoo = getDngWoo();

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    services: {
      fireblood: firebloodWoo ? 'initialized' : 'null (missing env vars)',
      topg: topgWoo ? 'initialized' : 'null (missing env vars)',
      dng: dngWoo ? 'initialized' : 'null (missing env vars)',
    },
    envCheck: {
      FIREBLOOD_URL: !!process.env.WOOCOMMERCE_FIREBLOOD_URL,
      FIREBLOOD_KEY: !!process.env.WOOCOMMERCE_FIREBLOOD_KEY,
      FIREBLOOD_SECRET: !!process.env.WOOCOMMERCE_FIREBLOOD_SECRET,
      TOPG_URL: !!process.env.WOOCOMMERCE_TOPG_URL,
      TOPG_KEY: !!process.env.WOOCOMMERCE_TOPG_KEY,
      TOPG_SECRET: !!process.env.WOOCOMMERCE_TOPG_SECRET,
      DNG_URL: !!process.env.WOOCOMMERCE_DNG_URL,
      DNG_KEY: !!process.env.WOOCOMMERCE_DNG_KEY,
      DNG_SECRET: !!process.env.WOOCOMMERCE_DNG_SECRET,
    },
  };

  // Test direct API calls
  if (firebloodWoo) {
    try {
      const stats = await firebloodWoo.getOrderStats('month');
      results.firebloodDirect = stats;
    } catch (e) {
      results.firebloodDirectError = String(e);
    }
  }

  // Test getOverviewData to see what it returns
  try {
    const overview = await getOverviewData('month');
    results.overviewMetrics = overview.metrics;
    results.overviewDataSource = overview.dataSource;
  } catch (e) {
    results.overviewError = String(e);
  }

  return NextResponse.json(results);
}
