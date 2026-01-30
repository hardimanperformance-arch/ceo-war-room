import { NextResponse } from 'next/server';

export async function GET() {
  const firebloodUrl = process.env.WOOCOMMERCE_FIREBLOOD_URL;
  const firebloodKey = process.env.WOOCOMMERCE_FIREBLOOD_KEY;
  const firebloodSecret = process.env.WOOCOMMERCE_FIREBLOOD_SECRET;

  if (!firebloodUrl || !firebloodKey || !firebloodSecret) {
    return NextResponse.json({ error: 'Missing credentials' });
  }

  const auth = Buffer.from(`${firebloodKey}:${firebloodSecret}`).toString('base64');
  
  // Get date range for this month
  const now = new Date();
  const after = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
  const before = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  let allOrders: any[] = [];
  let page = 1;
  const pageResults: number[] = [];

  while (true) {
    const url = new URL(`${firebloodUrl}/wp-json/wc/v3/orders`);
    url.searchParams.set('after', after);
    url.searchParams.set('before', before);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('status', 'completed,processing');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: `API error: ${response.status}`, page });
    }

    const orders = await response.json();
    pageResults.push(orders.length);
    allOrders = allOrders.concat(orders);

    if (orders.length < 100) break;
    page++;
    if (page > 20) break;
  }

  const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);

  return NextResponse.json({
    totalOrders: allOrders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    pages: page,
    pageResults,
    dateRange: { after, before },
  });
}
