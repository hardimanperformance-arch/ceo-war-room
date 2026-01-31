import type { DashboardData, OverviewData, BrandData, MetricWithDelta } from '../../types/dashboard';

export const INSIGHTS_SYSTEM_PROMPT = `You are a sharp business analyst for a DTC e-commerce portfolio with 3 brands: Fireblood (supplements), Top G (merch), and DNG (comics).

Your job: Analyze the data and give 3-5 concise, actionable insights. Be direct and specific.

Rules:
1. Start each insight with an emoji:
   - 🔥 Urgent issues requiring immediate attention
   - ✅ Wins to celebrate and scale
   - ⚠️ Warning signs to watch
   - 💡 Opportunities to explore

2. Each insight should be 1-2 sentences max
3. Include specific numbers and percentages
4. Focus on what's changed and why it matters
5. Prioritize insights by business impact
6. Be direct - no fluff, no hedging

Example format:
🔥 DNG orders down 18% despite 12% traffic increase - conversion issue. Check checkout flow or pricing.
✅ Fireblood ROAS improved from 2.1x to 3.4x - scale ad spend from current levels.
⚠️ Top G average order value dropped £8 (12%) - possible discount overuse or product mix shift.`;

interface MetricSummary {
  label: string;
  current: string;
  previous?: string;
  deltaPercent?: number;
}

export function buildInsightsPrompt(
  currentData: DashboardData,
  previousData: DashboardData | null,
  metricsWithDeltas: MetricWithDelta[],
  period: string,
  tab: string
): string {
  const parts: string[] = [];

  // Period context
  parts.push(`## Analysis Period: ${period}`);
  parts.push(`## Dashboard View: ${tab}`);
  parts.push('');

  // Metrics with changes
  parts.push('## Key Metrics (Current vs Previous Period)');
  parts.push('');

  for (const metric of metricsWithDeltas) {
    const delta = metric.deltaPercent !== undefined
      ? ` (${metric.deltaPercent > 0 ? '+' : ''}${metric.deltaPercent.toFixed(1)}%)`
      : '';
    const prev = metric.previousValue ? ` | Previous: ${metric.previousValue}` : '';
    parts.push(`- ${metric.label}: ${metric.value}${delta}${prev}`);
  }

  // Add overview-specific data
  if (tab === 'overview' && 'brandBreakdown' in currentData) {
    const overview = currentData as OverviewData;

    if (overview.brandBreakdown?.length) {
      parts.push('');
      parts.push('## Revenue by Brand');
      for (const brand of overview.brandBreakdown) {
        const liveStatus = brand.isLive ? '' : ' (no data)';
        parts.push(`- ${brand.name}: £${brand.value.toLocaleString()}${liveStatus}`);
      }
    }

    if (overview.trafficOverview?.length) {
      parts.push('');
      parts.push('## Traffic by Brand');
      for (const row of overview.trafficOverview) {
        if (row.isLive) {
          parts.push(`- ${row.brand}: ${row.sessions.toLocaleString()} sessions, ${row.convRate.toFixed(2)}% conversion, ${row.orders} orders`);
        }
      }
    }

    if (overview.adsOverview?.length) {
      parts.push('');
      parts.push('## Ads Performance');
      for (const row of overview.adsOverview) {
        if (row.isLive) {
          parts.push(`- ${row.brand}: £${row.spend.toFixed(0)} spend, ${row.roas.toFixed(2)}x ROAS, ${row.conversions.toFixed(0)} conversions`);
        }
      }

      if (overview.adsSummary) {
        parts.push(`- TOTAL: £${overview.adsSummary.spend.toFixed(0)} spend, ${overview.adsSummary.roas.toFixed(2)}x blended ROAS`);
      }
    }
  }

  // Add brand-specific data
  if (tab !== 'overview' && 'topProducts' in currentData) {
    const brand = currentData as BrandData;

    if (brand.topProducts?.length) {
      parts.push('');
      parts.push('## Top Products');
      for (const product of brand.topProducts.slice(0, 5)) {
        parts.push(`- ${product.name}: £${product.revenue.toLocaleString()} (${product.units} units)`);
      }
    }

    if (brand.subscriptionMetrics) {
      parts.push('');
      parts.push('## Subscription Metrics');
      if (brand.subscriptionMetrics.activeSubscribers !== null) {
        parts.push(`- Active Subscribers: ${brand.subscriptionMetrics.activeSubscribers.toLocaleString()}`);
      }
      if (brand.subscriptionMetrics.mrr !== null) {
        parts.push(`- MRR: £${brand.subscriptionMetrics.mrr.toLocaleString()}`);
      }
      if (brand.subscriptionMetrics.churnRate !== null) {
        parts.push(`- Churn Rate: ${brand.subscriptionMetrics.churnRate}%`);
      }
    }
  }

  parts.push('');
  parts.push('---');
  parts.push('Based on this data, provide 3-5 actionable insights. Focus on the most significant changes and their implications.');

  return parts.join('\n');
}

export function parseInsights(text: string): Array<{
  emoji: string;
  type: 'alert' | 'win' | 'warning' | 'opportunity';
  text: string;
}> {
  const lines = text.split('\n').filter(line => line.trim());
  const insights: Array<{ emoji: string; type: 'alert' | 'win' | 'warning' | 'opportunity'; text: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let type: 'alert' | 'win' | 'warning' | 'opportunity' = 'opportunity';
    let emoji = '💡';

    if (trimmed.startsWith('🔥')) {
      type = 'alert';
      emoji = '🔥';
    } else if (trimmed.startsWith('✅')) {
      type = 'win';
      emoji = '✅';
    } else if (trimmed.startsWith('⚠️')) {
      type = 'warning';
      emoji = '⚠️';
    } else if (trimmed.startsWith('💡')) {
      type = 'opportunity';
      emoji = '💡';
    } else {
      // Skip lines that don't start with our expected emojis
      continue;
    }

    const text = trimmed.replace(/^[🔥✅⚠️💡]\s*/, '').trim();
    if (text) {
      insights.push({ emoji, type, text });
    }
  }

  return insights;
}
