import { NextResponse } from 'next/server';
import { getFirebloodWoo, getTopgWoo, getDngWoo } from '@/lib/services/woocommerce';

export async function GET() {
  const results: any = {
    fireblood: { configured: false },
    topg: { configured: false },
    dng: { configured: false },
  };

  // Test Fireblood
  const fbWoo = getFirebloodWoo();
  if (fbWoo) {
    results.fireblood.configured = true;
    try {
      const stats = await fbWoo.getOrderStats('month');
      results.fireblood.success = true;
      results.fireblood.data = stats;
    } catch (error) {
      results.fireblood.success = false;
      results.fireblood.error = String(error);
    }
  }

  // Test TopG
  const topgWoo = getTopgWoo();
  if (topgWoo) {
    results.topg.configured = true;
    try {
      const stats = await topgWoo.getOrderStats('month');
      results.topg.success = true;
      results.topg.data = stats;
    } catch (error) {
      results.topg.success = false;
      results.topg.error = String(error);
    }
  }

  // Test DNG
  const dngWoo = getDngWoo();
  if (dngWoo) {
    results.dng.configured = true;
    try {
      const stats = await dngWoo.getOrderStats('month');
      results.dng.success = true;
      results.dng.data = stats;
    } catch (error) {
      results.dng.success = false;
      results.dng.error = String(error);
    }
  }

  return NextResponse.json(results);
}
