import {
  startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear,
  subDays, subWeeks, subMonths, subYears, format, differenceInDays
} from 'date-fns';
import type { TimePeriod, ComparisonPeriod, DateRange } from '../../types/dashboard';

export interface PeriodDates {
  start: Date;
  end: Date;
}

export interface ComparisonDateRanges {
  current: PeriodDates;
  previous: PeriodDates | null;
}

/**
 * Get date range for a given period
 */
export function getPeriodDates(period: TimePeriod, customRange?: DateRange): PeriodDates {
  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (period) {
    case 'today':
      return { start: today, end: todayEnd };

    case 'week':
      return { start: subDays(today, 6), end: todayEnd };

    case 'month':
      return { start: subDays(today, 29), end: todayEnd };

    case 'year':
      return { start: subDays(today, 364), end: todayEnd };

    case 'custom':
      if (customRange) {
        return {
          start: startOfDay(customRange.start),
          end: endOfDay(customRange.end)
        };
      }
      // Fallback to last 30 days
      return { start: subDays(today, 29), end: todayEnd };

    default:
      return { start: subDays(today, 29), end: todayEnd };
  }
}

/**
 * Get the previous period dates for comparison
 */
export function getPreviousPeriodDates(
  currentDates: PeriodDates,
  comparison: ComparisonPeriod
): PeriodDates | null {
  if (comparison === 'none') return null;

  const daysDiff = differenceInDays(currentDates.end, currentDates.start) + 1;

  if (comparison === 'previous_year') {
    return {
      start: subYears(currentDates.start, 1),
      end: subYears(currentDates.end, 1)
    };
  }

  // previous_period - same duration, immediately before
  return {
    start: subDays(currentDates.start, daysDiff),
    end: subDays(currentDates.end, daysDiff)
  };
}

/**
 * Get both current and previous period date ranges
 */
export function getComparisonDateRanges(
  period: TimePeriod,
  comparison: ComparisonPeriod,
  customRange?: DateRange
): ComparisonDateRanges {
  const current = getPeriodDates(period, customRange);
  const previous = getPreviousPeriodDates(current, comparison);

  return { current, previous };
}

/**
 * Get human-readable comparison label
 */
export function getComparisonLabel(
  period: TimePeriod,
  comparison: ComparisonPeriod
): string {
  if (comparison === 'none') return '';

  if (comparison === 'previous_year') {
    return 'vs Last Year';
  }

  switch (period) {
    case 'today':
      return 'vs Yesterday';
    case 'week':
      return 'vs Previous 7 Days';
    case 'month':
      return 'vs Previous 30 Days';
    case 'year':
      return 'vs Previous Year';
    case 'custom':
      return 'vs Previous Period';
    default:
      return 'vs Previous Period';
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(dates: PeriodDates): string {
  const startStr = format(dates.start, 'MMM d');
  const endStr = format(dates.end, 'MMM d, yyyy');

  if (format(dates.start, 'yyyy-MM-dd') === format(dates.end, 'yyyy-MM-dd')) {
    return format(dates.start, 'MMM d, yyyy');
  }

  return `${startStr} - ${endStr}`;
}

/**
 * Format dates for API calls (ISO string format)
 */
export function formatForApi(dates: PeriodDates): { startDate: string; endDate: string } {
  return {
    startDate: format(dates.start, 'yyyy-MM-dd'),
    endDate: format(dates.end, 'yyyy-MM-dd')
  };
}

/**
 * Calculate delta percentage between two values
 */
export function calculateDelta(current: number, previous: number): {
  percent: number;
  absolute: number;
  direction: 'up' | 'down' | 'flat';
} {
  if (previous === 0) {
    return {
      percent: current > 0 ? 100 : 0,
      absolute: current,
      direction: current > 0 ? 'up' : 'flat'
    };
  }

  const percent = ((current - previous) / previous) * 100;
  const absolute = current - previous;

  return {
    percent,
    absolute,
    direction: percent > 0.5 ? 'up' : percent < -0.5 ? 'down' : 'flat'
  };
}

/**
 * Parse a raw metric value to number (handles currency, percentages, etc.)
 */
export function parseMetricValue(value: string): number {
  // Remove currency symbols, commas, percentage signs
  const cleaned = value.replace(/[£$€,\s%]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
