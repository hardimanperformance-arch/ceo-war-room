// Google Ads API Service
import { google } from 'googleapis';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  start: string;
  end: string;
}

interface GoogleAdsConfig {
  customerId: string;
  credentials: {
    client_email: string;
    private_key: string;
  };
}

export class GoogleAdsService {
  private customerId: string;
  private auth: any;

  constructor(config: GoogleAdsConfig) {
    // Remove dashes from customer ID
    this.customerId = config.customerId.replace(/-/g, '');
    
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.credentials.client_email,
        private_key: config.credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/adwords'],
    });
  }

  private getDateRange(period: Period, customRange?: DateRange): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();

    if (period === 'custom' && customRange) {
      return { 
        startDate: customRange.start.replace(/-/g, ''), 
        endDate: customRange.end.replace(/-/g, '') 
      };
    }

    switch (period) {
      case 'today':
        startDate = new Date();
        break;
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'year':
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }

    const formatDate = (d: Date) => {
      return d.toISOString().split('T')[0];
    };

    return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
  }

  async getAccountStats(period: Period = 'month', customRange?: DateRange) {
    const { startDate, endDate } = this.getDateRange(period, customRange);

    try {
      const authClient = await this.auth.getClient();
      const accessToken = await authClient.getAccessToken();

      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion
        FROM customer
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      `;

      const response = await fetch(
        `https://googleads.googleapis.com/v15/customers/${this.customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Ads API error:', error);
        throw new Error(`Google Ads API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Aggregate results
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalCostMicros = 0;
      let totalConversions = 0;
      let totalConversionValue = 0;

      if (data && Array.isArray(data)) {
        for (const batch of data) {
          if (batch.results) {
            for (const row of batch.results) {
              const metrics = row.metrics || {};
              totalImpressions += parseInt(metrics.impressions || '0');
              totalClicks += parseInt(metrics.clicks || '0');
              totalCostMicros += parseInt(metrics.costMicros || '0');
              totalConversions += parseFloat(metrics.conversions || '0');
              totalConversionValue += parseFloat(metrics.conversionsValue || '0');
            }
          }
        }
      }

      const totalSpend = totalCostMicros / 1000000; // Convert micros to currency
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const costPerConversion = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const roas = totalSpend > 0 ? totalConversionValue / totalSpend : 0;

      return {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        conversions: totalConversions,
        conversionValue: totalConversionValue,
        ctr,
        avgCpc,
        costPerConversion,
        roas,
      };
    } catch (error) {
      console.error('Google Ads getAccountStats error:', error);
      throw error;
    }
  }

  async getCampaignStats(period: Period = 'month', customRange?: DateRange) {
    const { startDate, endDate } = this.getDateRange(period, customRange);

    try {
      const authClient = await this.auth.getClient();
      const accessToken = await authClient.getAccessToken();

      const query = `
        SELECT
          campaign.name,
          campaign.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 10
      `;

      const response = await fetch(
        `https://googleads.googleapis.com/v15/customers/${this.customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Ads API error:', error);
        throw new Error(`Google Ads API error: ${response.status}`);
      }

      const data = await response.json();
      const campaigns: any[] = [];

      if (data && Array.isArray(data)) {
        for (const batch of data) {
          if (batch.results) {
            for (const row of batch.results) {
              const campaign = row.campaign || {};
              const metrics = row.metrics || {};
              const spend = parseInt(metrics.costMicros || '0') / 1000000;
              const conversions = parseFloat(metrics.conversions || '0');
              const conversionValue = parseFloat(metrics.conversionsValue || '0');
              
              campaigns.push({
                name: campaign.name,
                status: campaign.status,
                impressions: parseInt(metrics.impressions || '0'),
                clicks: parseInt(metrics.clicks || '0'),
                spend,
                conversions,
                conversionValue,
                roas: spend > 0 ? conversionValue / spend : 0,
                cpa: conversions > 0 ? spend / conversions : 0,
              });
            }
          }
        }
      }

      return campaigns;
    } catch (error) {
      console.error('Google Ads getCampaignStats error:', error);
      throw error;
    }
  }
}

// Factory functions
function createGoogleAdsService(customerId: string | undefined): GoogleAdsService | null {
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!customerId || !clientEmail || !privateKey) {
    return null;
  }

  return new GoogleAdsService({
    customerId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

export function getFirebloodGoogleAds(): GoogleAdsService | null {
  return createGoogleAdsService(process.env.GOOGLE_ADS_FIREBLOOD_CUSTOMER_ID);
}

export function getTopgGoogleAds(): GoogleAdsService | null {
  return createGoogleAdsService(process.env.GOOGLE_ADS_TOPG_CUSTOMER_ID);
}
