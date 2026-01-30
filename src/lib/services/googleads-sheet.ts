// Google Sheets service for reading Google Ads data

import { google } from 'googleapis';

interface GoogleAdsData {
  account: string;
  date: string;
  campaign: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  convValue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

interface AccountSummary {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  avgCpc: number;
  cpa: number;
  roas: number;
}

export class GoogleAdsSheetService {
  private sheets: any;
  private spreadsheetId: string;

  constructor(spreadsheetId: string, credentials: { client_email: string; private_key: string }) {
    this.spreadsheetId = spreadsheetId;
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async getSheetData(sheetName: string): Promise<GoogleAdsData[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:M`,
      });

      const rows = response.data.values || [];
      
      return rows.map((row: any[]) => ({
        account: row[0] || '',
        date: row[1] || '',
        campaign: row[2] || '',
        impressions: parseInt(row[3]) || 0,
        clicks: parseInt(row[4]) || 0,
        cost: parseFloat(row[5]) || 0,
        conversions: parseFloat(row[6]) || 0,
        convValue: parseFloat(row[7]) || 0,
        ctr: parseFloat(row[8]) || 0,
        cpc: parseFloat(row[9]) || 0,
        cpa: parseFloat(row[10]) || 0,
        roas: parseFloat(row[11]) || 0,
      }));
    } catch (error) {
      console.error(`Error reading ${sheetName} sheet:`, error);
      return [];
    }
  }

  async getAccountSummary(sheetName: string): Promise<AccountSummary | null> {
    const data = await this.getSheetData(sheetName);
    
    if (data.length === 0) return null;

    const summary = data.reduce((acc, row) => ({
      impressions: acc.impressions + row.impressions,
      clicks: acc.clicks + row.clicks,
      spend: acc.spend + row.cost,
      conversions: acc.conversions + row.conversions,
      conversionValue: acc.conversionValue + row.convValue,
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, conversionValue: 0 });

    return {
      ...summary,
      ctr: summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0,
      avgCpc: summary.clicks > 0 ? summary.spend / summary.clicks : 0,
      cpa: summary.conversions > 0 ? summary.spend / summary.conversions : 0,
      roas: summary.spend > 0 ? summary.conversionValue / summary.spend : 0,
    };
  }

  async getCampaignBreakdown(sheetName: string): Promise<any[]> {
    const data = await this.getSheetData(sheetName);
    
    // Aggregate by campaign
    const campaignMap = new Map<string, any>();
    
    for (const row of data) {
      const existing = campaignMap.get(row.campaign) || {
        campaign: row.campaign,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        conversionValue: 0,
      };
      
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.spend += row.cost;
      existing.conversions += row.conversions;
      existing.conversionValue += row.convValue;
      
      campaignMap.set(row.campaign, existing);
    }
    
    // Calculate derived metrics and sort by spend
    return Array.from(campaignMap.values())
      .map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
        cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
        roas: c.spend > 0 ? c.conversionValue / c.spend : 0,
      }))
      .sort((a, b) => b.spend - a.spend);
  }
}

// Factory function
export function getGoogleAdsSheetService(): GoogleAdsSheetService | null {
  const spreadsheetId = process.env.GOOGLE_ADS_SHEET_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.log('Google Ads Sheet not configured');
    return null;
  }

  return new GoogleAdsSheetService(spreadsheetId, {
    client_email: clientEmail,
    private_key: privateKey,
  });
}
