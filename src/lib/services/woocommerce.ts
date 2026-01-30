// WooCommerce API Service for pulling live store data

interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

interface Order {
  id: number;
  total: string;
  currency: string;
  status: string;
  date_created: string;
  billing: {
    email: string;
    country: string;
  };
  line_items: Array<{
    name: string;
    quantity: number;
    total: string;
  }>;
}

interface Subscription {
  id: number;
  status: string;
  total: string;
  billing_period: string;
  billing_interval: number;
}

interface DateRange {
  start: string;
  end: string;
}

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

export class WooCommerceService {
  private config: WooCommerceConfig;

  constructor(config: WooCommerceConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private getDateRange(period: Period, customRange?: DateRange): { after: string; before: string } {
    const now = new Date();
    let after: Date;
    let before: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (period === 'custom' && customRange) {
      after = new Date(customRange.start);
      after.setHours(0, 0, 0, 0);
      before = new Date(customRange.end);
      before.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case 'today':
          after = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          break;
        case 'week':
          after = new Date(now);
          after.setDate(now.getDate() - now.getDay());
          after.setHours(0, 0, 0, 0);
          break;
        case 'month':
          after = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          break;
        case 'year':
          after = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
          break;
        default:
          after = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      }
    }

    return {
      after: after.toISOString(),
      before: before.toISOString(),
    };
  }

  async getOrders(period: Period = 'month', customRange?: DateRange): Promise<Order[]> {
    const { after, before } = this.getDateRange(period, customRange);
    let allOrders: Order[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = new URL(`${this.config.url}/wp-json/wc/v3/orders`);
      url.searchParams.set('after', after);
      url.searchParams.set('before', before);
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      url.searchParams.set('status', 'completed,processing');

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        throw new Error(`WooCommerce API error: ${response.status}`);
      }

      const orders: Order[] = await response.json();
      allOrders = allOrders.concat(orders);

      // Check if there are more pages
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;

      // Safety limit to prevent infinite loops
      if (page > 50) break;
    }

    return allOrders;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const url = new URL(`${this.config.url}/wp-json/wc/v3/subscriptions`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('status', 'active');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      console.log('Subscriptions API not available or error:', response.status);
      return [];
    }

    return response.json();
  }

  async getOrderStats(period: Period = 'month', customRange?: DateRange): Promise<{
    revenue: number;
    orders: number;
    avgOrderValue: number;
  }> {
    const orders = await this.getOrders(period, customRange);
    
    const revenue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    return {
      revenue: Math.round(revenue),
      orders: orderCount,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    };
  }

  async getSubscriptionStats(): Promise<{
    activeSubscribers: number;
    mrr: number;
  } | null> {
    try {
      const subscriptions = await this.getSubscriptions();
      
      if (subscriptions.length === 0) {
        return null;
      }

      const activeSubscribers = subscriptions.length;
      const mrr = subscriptions.reduce((sum, sub) => {
        const total = parseFloat(sub.total);
        const interval = sub.billing_interval || 1;
        
        switch (sub.billing_period) {
          case 'week':
            return sum + (total * 4.33 / interval);
          case 'month':
            return sum + (total / interval);
          case 'year':
            return sum + (total / 12 / interval);
          default:
            return sum + total;
        }
      }, 0);

      return {
        activeSubscribers,
        mrr: Math.round(mrr),
      };
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      return null;
    }
  }
}

// Factory functions for each store
export function getFirebloodWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_FIREBLOOD_URL;
  const key = process.env.WOOCOMMERCE_FIREBLOOD_KEY;
  const secret = process.env.WOOCOMMERCE_FIREBLOOD_SECRET;

  if (!url || !key || !secret) {
    return null;
  }

  return new WooCommerceService({ url, consumerKey: key, consumerSecret: secret });
}

export function getTopgWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_TOPG_URL;
  const key = process.env.WOOCOMMERCE_TOPG_KEY;
  const secret = process.env.WOOCOMMERCE_TOPG_SECRET;

  if (!url || !key || !secret) {
    return null;
  }

  return new WooCommerceService({ url, consumerKey: key, consumerSecret: secret });
}

export function getDngWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_DNG_URL;
  const key = process.env.WOOCOMMERCE_DNG_KEY;
  const secret = process.env.WOOCOMMERCE_DNG_SECRET;

  if (!url || !key || !secret) {
    return null;
  }

  return new WooCommerceService({ url, consumerKey: key, consumerSecret: secret });
}
