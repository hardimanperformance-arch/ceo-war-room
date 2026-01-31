// Google Analytics 4 Data API Service
// With caching and timeout support

import { google } from 'googleapis';
import { cached, withTimeout } from '../cache';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

interface GA4Config {
  propertyId: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
  name: string; // For cache namespacing
}

// Cache TTL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const API_TIMEOUT = 8000; // 8 seconds (must fit within Vercel's function timeout)

export class GA4Service {
  private analyticsDataClient: ReturnType<typeof google.analyticsdata>;
  private propertyId: string;
  private name: string;

  constructor(config: GA4Config) {
    this.propertyId = config.propertyId;
    this.name = config.name;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.credentials.client_email,
        private_key: config.credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    this.analyticsDataClient = google.analyticsdata({
      version: 'v1beta',
      auth,
    });
  }

  private getDateRange(period: Period, customRange?: DateRange): { startDate: string; endDate: string } {
    if (period === 'custom' && customRange) {
      return { startDate: customRange.start, endDate: customRange.end };
    }

    let startDate: string;
    const endDate = 'today';

    switch (period) {
      case 'today':
        startDate = 'today';
        break;
      case 'week':
        startDate = '7daysAgo';
        break;
      case 'month':
        startDate = '30daysAgo';
        break;
      case 'year':
        startDate = '365daysAgo';
        break;
      default:
        startDate = '30daysAgo';
    }

    return { startDate, endDate };
  }

  async getTrafficStats(period: Period = 'month', customRange?: DateRange) {
    const { startDate, endDate } = this.getDateRange(period, customRange);
    const cacheKey = `ga4:${this.name}:traffic:${startDate}:${endDate}`;

    return cached(
      cacheKey,
      async () => {
        try {
          const response = await withTimeout(
            this.analyticsDataClient.properties.runReport({
              property: `properties/${this.propertyId}`,
              requestBody: {
                dateRanges: [{ startDate, endDate }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'totalUsers' },
                  { name: 'newUsers' },
                  { name: 'bounceRate' },
                  { name: 'averageSessionDuration' },
                  { name: 'screenPageViews' },
                ],
              },
            }),
            API_TIMEOUT,
            null
          );

          if (!response) {
            return {
              sessions: 0,
              totalUsers: 0,
              newUsers: 0,
              bounceRate: 0,
              avgSessionDuration: 0,
              pageViews: 0,
            };
          }

          const row = response.data.rows?.[0]?.metricValues || [];

          return {
            sessions: parseInt(row[0]?.value || '0'),
            totalUsers: parseInt(row[1]?.value || '0'),
            newUsers: parseInt(row[2]?.value || '0'),
            bounceRate: parseFloat(row[3]?.value || '0') * 100,
            avgSessionDuration: parseFloat(row[4]?.value || '0'),
            pageViews: parseInt(row[5]?.value || '0'),
          };
        } catch {
          return {
            sessions: 0,
            totalUsers: 0,
            newUsers: 0,
            bounceRate: 0,
            avgSessionDuration: 0,
            pageViews: 0,
          };
        }
      },
      CACHE_TTL
    );
  }

  async getTrafficByChannel(period: Period = 'month', customRange?: DateRange) {
    const { startDate, endDate } = this.getDateRange(period, customRange);
    const cacheKey = `ga4:${this.name}:channels:${startDate}:${endDate}`;

    return cached(
      cacheKey,
      async () => {
        try {
          const response = await withTimeout(
            this.analyticsDataClient.properties.runReport({
              property: `properties/${this.propertyId}`,
              requestBody: {
                dateRanges: [{ startDate, endDate }],
                dimensions: [{ name: 'sessionDefaultChannelGroup' }],
                metrics: [
                  { name: 'sessions' },
                  { name: 'totalUsers' },
                  { name: 'conversions' },
                ],
                orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
                limit: '10',
              },
            }),
            API_TIMEOUT,
            null
          );

          if (!response) return [];

          return (response.data.rows || []).map((row) => ({
            channel: row.dimensionValues?.[0]?.value || 'Unknown',
            sessions: parseInt(row.metricValues?.[0]?.value || '0'),
            users: parseInt(row.metricValues?.[1]?.value || '0'),
            conversions: parseInt(row.metricValues?.[2]?.value || '0'),
          }));
        } catch {
          return [];
        }
      },
      CACHE_TTL
    );
  }
}

// Factory functions for each brand
function createGA4Service(propertyId: string | undefined, name: string): GA4Service | null {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!propertyId || !clientEmail || !privateKey) {
    return null;
  }

  return new GA4Service({
    propertyId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    name,
  });
}

export function getFirebloodGA4(): GA4Service | null {
  return createGA4Service(process.env.GA4_FIREBLOOD_PROPERTY_ID, 'fireblood');
}

export function getTopgGA4(): GA4Service | null {
  return createGA4Service(process.env.GA4_TOPG_PROPERTY_ID, 'topg');
}

export function getDngGA4(): GA4Service | null {
  return createGA4Service(process.env.GA4_DNG_PROPERTY_ID, 'dng');
}

// Legacy function for backwards compatibility
export function getGA4Service(): GA4Service | null {
  return getFirebloodGA4();
}
