// WooCommerce API Service

interface WooConfig {
  url: string;
  key: string;
  secret: string;
}

interface WooOrder {
  id: number;
  status: string;
  total: string;
  date_created: string;
  line_items: Array<{
    product_id: number;
    name: string;
    quantity: number;
    total: string;
  }>;
  billing: {
    email: string;
  };
  meta_data: Array<{
    key: string;
    value: string;
  }>;
}

interface WooSubscription {
  id: number;
  status: string;
  total: string;
  billing_period: string;
  billing_interval: number;
  next_payment_date: string;
  date_created: string;
}

export class WooCommerceService {
  private config: WooConfig;
  
  constructor(config: WooConfig) {
    this.config = config;
  }
  
  private async fetch(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.config.url}/wp-json/wc/v3/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    const auth = Buffer.from(`${this.config.key}:${this.config.secret}`).toString('base64');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    });
    
    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status}`);
    }
    
    return response.json();
  }
  
  async getOrders(params: { after?: string; before?: string; per_page?: number; status?: string } = {}): Promise<WooOrder[]> {
    return this.fetch('orders', {
      per_page: String(params.per_page || 100),
      ...(params.after && { after: params.after }),
      ...(params.before && { before: params.before }),
      ...(params.status && { status: params.status }),
    });
  }
  
  async getSubscriptions(params: { per_page?: number; status?: string } = {}): Promise<WooSubscription[]> {
    return this.fetch('subscriptions', {
      per_page: String(params.per_page || 100),
      ...(params.status && { status: params.status }),
    });
  }
  
  async getOrderStats(period: 'today' | 'week' | 'month' | 'year' = 'month') {
    const now = new Date();
    let after: Date;
    
    switch (period) {
      case 'today':
        after = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        after = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        after = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        after = new Date(now.getFullYear(), 0, 1);
        break;
    }
    
    const orders = await this.getOrders({
      after: after.toISOString(),
      status: 'completed,processing',
      per_page: 100,
    });
    
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return {
      revenue: totalRevenue,
      orders: totalOrders,
      avgOrderValue,
      period,
    };
  }
  
  async getSubscriptionStats() {
    try {
      const subscriptions = await this.getSubscriptions({ status: 'active', per_page: 100 });
      
      const activeCount = subscriptions.length;
      const mrr = subscriptions.reduce((sum, sub) => {
        const total = parseFloat(sub.total);
        if (sub.billing_period === 'year') return sum + (total / 12);
        if (sub.billing_period === 'week') return sum + (total * 4.33);
        return sum + total;
      }, 0);
      
      return {
        activeSubscribers: activeCount,
        mrr: Math.round(mrr),
      };
    } catch (error) {
      console.error('Subscription fetch error:', error);
      return null;
    }
  }
}

export function getFirebloodWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_FIREBLOOD_URL;
  const key = process.env.WOOCOMMERCE_FIREBLOOD_KEY;
  const secret = process.env.WOOCOMMERCE_FIREBLOOD_SECRET;
  
  if (!url || !key || !secret) {
    console.log('Fireblood WooCommerce not configured');
    return null;
  }
  
  return new WooCommerceService({ url, key, secret });
}

export function getTopgWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_TOPG_URL;
  const key = process.env.WOOCOMMERCE_TOPG_KEY;
  const secret = process.env.WOOCOMMERCE_TOPG_SECRET;
  
  if (!url || !key || !secret) {
    console.log('TopG WooCommerce not configured');
    return null;
  }
  
  return new WooCommerceService({ url, key, secret });
}

export function getDngWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_DNG_URL;
  const key = process.env.WOOCOMMERCE_DNG_KEY;
  const secret = process.env.WOOCOMMERCE_DNG_SECRET;
  
  if (!url || !key || !secret) {
    console.log('DNG WooCommerce not configured');
    return null;
  }
  
  return new WooCommerceService({ url, key, secret });
}
