// WooCommerce API Service for pulling live store data
// With caching and timeout support for performance

import { cached, withTimeout } from '../cache';

interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  name: string; // For cache key namespacing
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

// Cache TTLs
const CACHE_TTL = {
  orders: 3 * 60 * 1000,        // 3 minutes for orders
  subscriptions: 5 * 60 * 1000,  // 5 minutes for subscriptions
  monthly: 10 * 60 * 1000,       // 10 minutes for monthly data
};

// API timeout (Vercel free tier = 10s total, so keep individual calls short)
const API_TIMEOUT = 5000; // 5 seconds

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

  private async fetchOrdersPage(after: string, before: string, page: number): Promise<Order[]> {
    const url = new URL(`${this.config.url}/wp-json/wc/v3/orders`);
    url.searchParams.set('after', after);
    url.searchParams.set('before', before);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('status', 'completed,processing');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`WooCommerce API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async getOrders(period: Period = 'month', customRange?: DateRange): Promise<Order[]> {
    const { after, before } = this.getDateRange(period, customRange);
    const cacheKey = `woo:${this.config.name}:orders:${after}:${before}`;

    return cached(
      cacheKey,
      async () => {
        let allOrders: Order[] = [];
        let page = 1;

        while (true) {
          try {
            const orders = await this.fetchOrdersPage(after, before, page);
            allOrders = allOrders.concat(orders);

            if (orders.length < 100) break;
            page++;
            if (page > 50) break; // Safety limit
          } catch (error) {
            // If we have some orders, return them; otherwise rethrow
            if (allOrders.length > 0) break;
            throw error;
          }
        }

        return allOrders;
      },
      CACHE_TTL.orders
    );
  }

  async getSubscriptions(): Promise<Subscription[]> {
    const cacheKey = `woo:${this.config.name}:subscriptions`;

    return cached(
      cacheKey,
      async () => {
        const url = new URL(`${this.config.url}/wp-json/wc/v3/subscriptions`);
        url.searchParams.set('per_page', '100');
        url.searchParams.set('status', 'active');

        const result = await withTimeout(
          fetch(url.toString(), {
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
          }).then(async (response) => {
            if (!response.ok) return [];
            return response.json();
          }),
          API_TIMEOUT,
          []
        );

        return result;
      },
      CACHE_TTL.subscriptions
    );
  }

  async getOrderStats(period: Period = 'month', customRange?: DateRange): Promise<{
    revenue: number;
    orders: number;
    avgOrderValue: number;
  }> {
    const { after, before } = this.getDateRange(period, customRange);
    const cacheKey = `woo:${this.config.name}:stats:${after}:${before}`;

    return cached(
      cacheKey,
      async () => {
        try {
          // Use WooCommerce Reports API for fast aggregated stats (single request)
          const url = new URL(`${this.config.url}/wp-json/wc/v3/reports/sales`);
          url.searchParams.set('date_min', after.split('T')[0]);
          url.searchParams.set('date_max', before.split('T')[0]);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': this.getAuthHeader(),
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`WooCommerce Reports API error: ${response.status}`);
          }

          const data = await response.json();
          // WooCommerce returns array with one totals object
          const totals = Array.isArray(data) ? data[0] : data;

          const revenue = parseFloat(totals?.total_sales || '0');
          const orderCount = parseInt(totals?.total_orders || '0');
          const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

          return {
            revenue: Math.round(revenue),
            orders: orderCount,
            avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          };
        } catch {
          return { revenue: 0, orders: 0, avgOrderValue: 0 };
        }
      },
      CACHE_TTL.orders
    );
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
    } catch {
      return null;
    }
  }

  async getTopProducts(period: Period = 'month', customRange?: DateRange, limit: number = 10): Promise<{
    name: string;
    revenue: number;
    units: number;
  }[]> {
    try {
      const orders = await this.getOrders(period, customRange);

      const productMap = new Map<string, { revenue: number; units: number }>();

      for (const order of orders) {
        for (const item of order.line_items) {
          const existing = productMap.get(item.name) || { revenue: 0, units: 0 };
          existing.revenue += parseFloat(item.total) || 0;
          existing.units += item.quantity || 0;
          productMap.set(item.name, existing);
        }
      }

      return Array.from(productMap.entries())
        .map(([name, data]) => ({
          name,
          revenue: Math.round(data.revenue),
          units: data.units,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  // OPTIMIZED: Fetch all months in parallel instead of sequential
  async getMonthlyRevenue(months: number = 6): Promise<{ month: string; revenue: number; orders: number }[]> {
    const cacheKey = `woo:${this.config.name}:monthly:${months}`;

    return cached(
      cacheKey,
      async () => {
        const now = new Date();

        // Build array of month date ranges
        const monthRanges = Array.from({ length: months }, (_, i) => {
          const idx = months - 1 - i;
          const startDate = new Date(now.getFullYear(), now.getMonth() - idx, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth() - idx + 1, 0, 23, 59, 59);
          const monthName = startDate.toLocaleString('en-GB', { month: 'short' });

          return {
            monthName,
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
          };
        });

        // Fetch ALL months in parallel - getOrderStats has its own timeout handling
        const results = await Promise.all(
          monthRanges.map(async ({ monthName, start, end }) => {
            try {
              const stats = await this.getOrderStats('custom', { start, end });
              return { month: monthName, revenue: stats.revenue, orders: stats.orders };
            } catch {
              return { month: monthName, revenue: 0, orders: 0 };
            }
          })
        );

        return results;
      },
      CACHE_TTL.monthly
    );
  }

  async getChurnData(): Promise<{ churnRate: number; cancelledThisMonth: number; activeStart: number } | null> {
    const cacheKey = `woo:${this.config.name}:churn`;

    return cached(
      cacheKey,
      async () => {
        try {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

          const cancelledUrl = new URL(`${this.config.url}/wp-json/wc/v3/subscriptions`);
          cancelledUrl.searchParams.set('per_page', '100');
          cancelledUrl.searchParams.set('status', 'cancelled');

          const cancelledSubs = await withTimeout(
            fetch(cancelledUrl.toString(), {
              headers: {
                'Authorization': this.getAuthHeader(),
                'Content-Type': 'application/json',
              },
            }).then(async (r) => (r.ok ? r.json() : [])),
            API_TIMEOUT,
            []
          );

          const cancelledThisMonth = cancelledSubs.filter((sub: { date_modified?: string; date_created: string }) => {
            const cancelDate = new Date(sub.date_modified || sub.date_created);
            return cancelDate >= monthStart;
          }).length;

          const activeSubs = await this.getSubscriptions();
          const activeCount = activeSubs.length;
          const activeStart = activeCount + cancelledThisMonth;
          const churnRate = activeStart > 0 ? (cancelledThisMonth / activeStart) * 100 : 0;

          return {
            churnRate: Math.round(churnRate * 10) / 10,
            cancelledThisMonth,
            activeStart,
          };
        } catch {
          return null;
        }
      },
      CACHE_TTL.subscriptions
    );
  }
}

// Factory functions for each store
export function getFirebloodWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_FIREBLOOD_URL;
  const key = process.env.WOOCOMMERCE_FIREBLOOD_KEY;
  const secret = process.env.WOOCOMMERCE_FIREBLOOD_SECRET;

  if (!url || !key || !secret) return null;

  return new WooCommerceService({ url, consumerKey: key, consumerSecret: secret, name: 'fireblood' });
}

export function getTopgWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_TOPG_URL;
  const key = process.env.WOOCOMMERCE_TOPG_KEY;
  const secret = process.env.WOOCOMMERCE_TOPG_SECRET;

  if (!url || !key || !secret) return null;

  return new WooCommerceService({ url, consumerKey: key, consumerSecret: secret, name: 'topg' });
}

export function getDngWoo(): WooCommerceService | null {
  const url = process.env.WOOCOMMERCE_DNG_URL;
  const key = process.env.WOOCOMMERCE_DNG_KEY;
  const secret = process.env.WOOCOMMERCE_DNG_SECRET;

  if (!url || !key || !secret) return null;

  return new WooCommerceService({ url, consumerKey: key, consumerSecret: secret, name: 'dng' });
}
