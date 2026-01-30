import { NextResponse } from 'next/server';

export async function GET() {
  const firebloodUrl = process.env.WOOCOMMERCE_FIREBLOOD_URL;
  const firebloodKey = process.env.WOOCOMMERCE_FIREBLOOD_KEY;
  const firebloodSecret = process.env.WOOCOMMERCE_FIREBLOOD_SECRET;
  
  // Check if env vars exist
  const envCheck = {
    hasUrl: !!firebloodUrl,
    hasKey: !!firebloodKey,
    hasSecret: !!firebloodSecret,
    urlValue: firebloodUrl || 'NOT SET',
    keyPrefix: firebloodKey ? firebloodKey.substring(0, 10) + '...' : 'NOT SET',
    secretPrefix: firebloodSecret ? firebloodSecret.substring(0, 10) + '...' : 'NOT SET',
  };

  // Try a simple API call
  if (firebloodUrl && firebloodKey && firebloodSecret) {
    try {
      const auth = Buffer.from(`${firebloodKey}:${firebloodSecret}`).toString('base64');
      const response = await fetch(`${firebloodUrl}/wp-json/wc/v3/orders?per_page=1`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
      
      return NextResponse.json({
        envCheck,
        apiTest: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
        }
      });
    } catch (error) {
      return NextResponse.json({
        envCheck,
        apiTest: {
          error: String(error),
        }
      });
    }
  }

  return NextResponse.json({ envCheck, apiTest: 'Skipped - missing credentials' });
}
