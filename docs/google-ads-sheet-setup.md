# Google Ads Sheet Setup for CEO War Room

The Acquirer Scorecard uses Google Ads data (CAC, ROAS) from a Google Sheet. This allows you to export your Google Ads data and have it automatically pulled into the dashboard.

## Step 1: Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it something like "CEO War Room - Google Ads Data"
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```

## Step 2: Create Sheet Tabs

Create a tab for each brand. The tab name must match exactly:
- `Fireblood` - for Fireblood Google Ads data
- `TopG` - for Top G Google Ads data

## Step 3: Add Column Headers

In Row 1, add these headers (in this exact order):

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Account | Date | Campaign | Impressions | Clicks | Cost | Conversions | ConvValue | CTR | CPC | CPA | ROAS |

## Step 4: Add Your Data

Starting from Row 2, add your Google Ads data. You can:
- Export from Google Ads and paste here
- Use Google Ads scripts to auto-populate
- Manually enter summary data

Example data:
```
Fireblood | 2024-01-15 | Brand Campaign | 50000 | 2500 | 1500.00 | 75 | 4500.00 | 5.00 | 0.60 | 20.00 | 3.00
Fireblood | 2024-01-15 | Shopping | 30000 | 1200 | 800.00 | 40 | 2400.00 | 4.00 | 0.67 | 20.00 | 3.00
```

### Column Definitions:
- **Account**: Brand name (e.g., "Fireblood")
- **Date**: Date of the data (YYYY-MM-DD)
- **Campaign**: Campaign name
- **Impressions**: Number of ad impressions
- **Clicks**: Number of clicks
- **Cost**: Total spend in GBP (e.g., 1500.00)
- **Conversions**: Number of conversions
- **ConvValue**: Conversion value in GBP
- **CTR**: Click-through rate as percentage (e.g., 5.00 for 5%)
- **CPC**: Cost per click in GBP
- **CPA**: Cost per acquisition in GBP (this becomes CAC in scorecard)
- **ROAS**: Return on ad spend as multiplier (e.g., 3.00 for 3x)

## Step 5: Share with Service Account

1. Find your GA4 service account email in Vercel env vars (`GA4_CLIENT_EMAIL`)
2. In Google Sheets, click "Share"
3. Add the service account email with "Viewer" access

## Step 6: Add Environment Variable

In Vercel, add this environment variable:
```
GOOGLE_ADS_SHEET_ID=your_spreadsheet_id_here
```

## How the Dashboard Uses This Data

The dashboard aggregates all rows in the sheet to calculate:
- **Total Spend**: Sum of all Cost values
- **Total Conversions**: Sum of all Conversions
- **CAC (CPA)**: Total Spend / Total Conversions
- **ROAS**: Total ConvValue / Total Spend

These feed into the Acquirer Scorecard metrics.

## Automation Options

### Option A: Manual Export
Export from Google Ads weekly/monthly and paste into the sheet.

### Option B: Google Ads Script
Set up a Google Ads script to auto-export data to the sheet daily.

### Option C: Supermetrics/Similar
Use a connector tool to sync Google Ads to Sheets automatically.
