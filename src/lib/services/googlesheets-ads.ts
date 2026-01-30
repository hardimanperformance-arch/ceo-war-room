// Google Sheets service for reading Google Ads data

import { google } from 'googleapis';

interface GoogleAdsRow {
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
  account: string;
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

export class GoogleSheetsAdsService {
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

  async getSheetData(sheetName: string): Promise<GoogleAdsRow[]> {
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
      console.error(`Error fetching ${sheetName} data:`, error);
      return [];
    }
  }

  async getAccountSummary(sheetName: string): Promise<AccountSummary | null> {
    const rows = await this.getSheetData(sheetName);
    
    if (rows.length === 0) return null;

    const summary = rows.reduce(
      (acc, row) => ({
        account: row.account,
        impressions: acc.impressions + row.impressions,
        clicks: acc.clicks + row.clicks,
        cost: acc.cost + row.cost,
        conversions: acc.conversions + row.conversions,
        convValue: acc.convValue + row.convValue,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      }),
      { account: '', impressions: 0, clicks: 0, cost: 0, conversions: 0, convValue: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0 }
    );

    // Calculate derived metrics
    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.cpc = summary.clicks > 0 ? summary.cost / summary.clicks : 0;
    summary.cpa = summary.conversions > 0 ? summary.cost / summary.conversions : 0;
    summary.roas = summary.cost > 0 ? summary.convValue / summary.cost : 0;

    return summary;
  }

  async getCampaignBreakdown(sheetName: string): Promise<any[]> {
    const rows = await this.getSheetData(sheetName);
    
    // Aggregate by campaign
    const campaignMap = new Map<string, any>();
    
    for (const row of rows) {
      const existing = campaignMap.get(row.campaign) || {
        campaign: row.campaign,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        convValue: 0,
      };
      
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.cost += row.cost;
      existing.conversions += row.conversions;
      existing.convValue += row.convValue;
      
      campaignMap.set(row.campaign, existing);
    }
    
    // Convert to array and calculate metrics
    return Array.from(campaignMap.values())
      .map(c => ({
        ...c,
        ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
        cpc: c.clicks > 0 ? c.cost / c.clicks : 0,
        cpa: c.conversions > 0 ? c.cost / c.conversions : 0,
        roas: c.cost > 0 ? c.convValue / c.cost : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }

  async getAllAccountsSummary(): Promise<{ fireblood: AccountSummary | null; topg: AccountSummary | null; total: AccountSummary | null }> {
    const [fireblood, topg] = await Promise.all([
      this.getAccountSummary('Fireblood'),
      this.getAccountSummary('TopG'),
    ]);

    let total: AccountSummary | null = null;
    
    if (fireblood || topg) {
      const fb = fireblood || { impressions: 0, clicks: 0, cost: 0, conversions: 0, convValue: 0 };
      const tg = topg || { impressions: 0, clicks: 0, cost: 0, conversions: 0, convValue: 0 };
      
      const totalImpressions = fb.impressions + tg.impressions;
      const totalClicks = fb.clicks + tg.clicks;
      const totalCost = fb.cost + tg.cost;
      const totalConversions = fb.conversions + tg.conversions;
      const totalConvValue = fb.convValue + tg.convValue;
      
      total = {
        account: 'Total',
        impressions: totalImpressions,
        clicks: totalClicks,
        cost: totalCost,
        conversions: totalConversions,
        convValue: totalConvValue,
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
        cpa: totalConversions > 0 ? totalCost / totalConversions : 0,
        roas: totalCost > 0 ? totalConvValue / totalCost : 0,
      };
    }

    return { fireblood, topg, total };
  }
}

// Factory function
export function getGoogleSheetsAdsService(): GoogleSheetsAdsService | null {
  const spreadsheetId = process.env.GOOGLE_ADS_SHEET_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.log('Google Sheets Ads service not configured');
    return null;
  }

  return new GoogleSheetsAdsService(spreadsheetId, {
    client_email: clientEmail,
    private_key: privateKey,
  });
}
