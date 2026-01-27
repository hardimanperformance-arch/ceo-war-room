// Google Analytics 4 Data API Service
import { google } from 'googleapis';

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
}

export class GA4Service {
  private analyticsDataClient: any;
  private propertyId: string;

  constructor(config: GA4Config) {
    this.propertyId = config.propertyId;
    
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

    try {
      const response = await this.analyticsDataClient.properties.runReport({
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
      });

      const row = response.data.rows?.[0]?.metricValues || [];
      
      return {
        sessions: parseInt(row[0]?.value || '0'),
        totalUsers: parseInt(row[1]?.value || '0'),
        newUsers: parseInt(row[2]?.value || '0'),
        bounceRate: parseFloat(row[3]?.value || '0') * 100,
        avgSessionDuration: parseFloat(row[4]?.value || '0'),
        pageViews: parseInt(row[5]?.value || '0'),
      };
    } catch (error) {
      console.error('GA4 getTrafficStats error:', error);
      throw error;
    }
  }

  async getTrafficByChannel(period: Period = 'month', customRange?: DateRange) {
    const { startDate, endDate } = this.getDateRange(period, customRange);

    try {
      const response = await this.analyticsDataClient.properties.runReport({
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
          limit: 10,
        },
      });

      return response.data.rows?.map((row: any) => ({
        channel: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        conversions: parseInt(row.metricValues[2].value),
      })) || [];
    } catch (error) {
      console.error('GA4 getTrafficByChannel error:', error);
      throw error;
    }
  }
}

// Factory functions for each brand
function createGA4Service(propertyId: string | undefined): GA4Service | null {
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
  });
}

export function getFirebloodGA4(): GA4Service | null {
  return createGA4Service(process.env.GA4_FIREBLOOD_PROPERTY_ID);
}

export function getTopgGA4(): GA4Service | null {
  return createGA4Service(process.env.GA4_TOPG_PROPERTY_ID);
}

export function getDngGA4(): GA4Service | null {
  return createGA4Service(process.env.GA4_DNG_PROPERTY_ID);
}

// Legacy function for backwards compatibility
export function getGA4Service(): GA4Service | null {
  return getFirebloodGA4();
}
