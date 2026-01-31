import { NextResponse } from 'next/server';
import { getFirebloodWoo, getTopgWoo, getDngWoo } from '@/lib/services/woocommerce';

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

  // Test actual API call if service exists
  if (firebloodWoo) {
    try {
      const stats = await firebloodWoo.getOrderStats('month');
      results.firebloodStats = stats;
    } catch (e) {
      results.firebloodError = String(e);
    }
  }

  if (topgWoo) {
    try {
      const stats = await topgWoo.getOrderStats('month');
      results.topgStats = stats;
    } catch (e) {
      results.topgError = String(e);
    }
  }

  if (dngWoo) {
    try {
      const stats = await dngWoo.getOrderStats('month');
      results.dngStats = stats;
    } catch (e) {
      results.dngError = String(e);
    }
  }

  return NextResponse.json(results);
}
