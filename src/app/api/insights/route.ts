import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { INSIGHTS_SYSTEM_PROMPT, buildInsightsPrompt } from '../../../lib/ai/prompts';
import type { DashboardData, MetricWithDelta } from '../../../types/dashboard';

// Simple in-memory cache for insights
const insightsCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(data: {
  tab: string;
  period: string;
  metricsWithDeltas: MetricWithDelta[];
}): string {
  // Create a hash based on the metrics values
  const metricsHash = data.metricsWithDeltas
    .map(m => `${m.label}:${m.value}:${m.deltaPercent ?? 'n'}`)
    .join('|');
  return `${data.tab}:${data.period}:${metricsHash}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      currentData,
      previousData,
      metricsWithDeltas,
      period,
      tab
    } = body as {
      currentData: DashboardData;
      previousData: DashboardData | null;
      metricsWithDeltas: MetricWithDelta[];
      period: string;
      tab: string;
    };

    // Check cache first
    const cacheKey = getCacheKey({ tab, period, metricsWithDeltas });
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new NextResponse(cached.text, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new NextResponse(
        '⚠️ AI insights not configured. Add ANTHROPIC_API_KEY to environment variables.',
        { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    // Build the prompt
    const userPrompt = buildInsightsPrompt(
      currentData,
      previousData,
      metricsWithDeltas,
      period,
      tab
    );

    // Create Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Use streaming for progressive display
    const stream = await anthropic.messages.stream({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Create a readable stream from the Anthropic stream
    const encoder = new TextEncoder();
    let fullText = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // Cache the complete response
          insightsCache.set(cacheKey, { text: fullText, timestamp: Date.now() });

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      }
    });

  } catch (error) {
    console.error('Insights API error:', error);
    return new NextResponse(
      '⚠️ Failed to generate insights. Please try again.',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}

// Also support GET for simple health check
export async function GET() {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  return NextResponse.json({
    status: 'ok',
    configured: hasApiKey,
    message: hasApiKey
      ? 'AI insights endpoint ready'
      : 'ANTHROPIC_API_KEY not configured'
  });
}
