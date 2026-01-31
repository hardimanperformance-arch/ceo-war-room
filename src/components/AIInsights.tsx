'use client';

import React, { useState, useCallback, memo } from 'react';
import type { DashboardData, MetricWithDelta, TabId, TimePeriod } from '../types/dashboard';

interface AIInsightsProps {
  currentData: DashboardData;
  previousData: DashboardData | null;
  metricsWithDeltas: MetricWithDelta[];
  period: TimePeriod;
  tab: TabId;
}

const AIInsights = memo(function AIInsights({
  currentData,
  previousData,
  metricsWithDeltas,
  period,
  tab
}: AIInsightsProps) {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInsights('');

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentData,
          previousData,
          metricsWithDeltas,
          period,
          tab
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        result += chunk;
        setInsights(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  }, [currentData, previousData, metricsWithDeltas, period, tab]);

  const formatInsights = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());

    return lines.map((line, i) => {
      const trimmed = line.trim();

      // Determine the type based on emoji
      let bgClass = 'bg-zinc-800/50';
      let borderClass = 'border-zinc-700';

      if (trimmed.startsWith('🔥')) {
        bgClass = 'bg-red-950/30';
        borderClass = 'border-red-500/30';
      } else if (trimmed.startsWith('✅')) {
        bgClass = 'bg-emerald-950/30';
        borderClass = 'border-emerald-500/30';
      } else if (trimmed.startsWith('⚠️')) {
        bgClass = 'bg-amber-950/30';
        borderClass = 'border-amber-500/30';
      } else if (trimmed.startsWith('💡')) {
        bgClass = 'bg-blue-950/30';
        borderClass = 'border-blue-500/30';
      }

      return (
        <div
          key={i}
          className={`p-3 rounded-lg border ${bgClass} ${borderClass} text-sm text-zinc-200 leading-relaxed`}
        >
          {trimmed}
        </div>
      );
    });
  };

  return (
    <div className="rounded-xl bg-zinc-900/80 border-2 border-zinc-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <h2 className="text-lg font-black text-white">AI Analysis</h2>
          {loading && (
            <span className="text-xs text-emerald-400 animate-pulse">Analyzing...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!loading && !insights && (
            <span className="text-xs text-zinc-500">Click Analyze to get insights</span>
          )}
          <span className="text-zinc-400 text-xl">
            {isExpanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Analyze Button */}
          <button
            onClick={fetchInsights}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
              loading
                ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                Analyzing data...
              </span>
            ) : insights ? (
              '🔄 Re-analyze'
            ) : (
              '✨ Analyze Performance'
            )}
          </button>

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Insights Display */}
          {insights && (
            <div className="space-y-2">
              {formatInsights(insights)}
            </div>
          )}

          {/* Empty State */}
          {!loading && !insights && !error && (
            <div className="text-center py-6 text-zinc-500 text-sm">
              <p>Click the button above to get AI-powered insights</p>
              <p className="text-xs mt-1">Analysis based on current metrics and comparison data</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AIInsights;
