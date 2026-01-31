'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { format, subDays, isAfter, isBefore, isSameDay } from 'date-fns';
import type { DateRange, TimePeriod } from '../types/dashboard';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  customRange: DateRange | null;
  onChange: (period: TimePeriod, range?: DateRange) => void;
}

const PRESETS: { id: TimePeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
];

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const TimePeriodSelector = memo(function TimePeriodSelector({
  value,
  customRange,
  onChange
}: TimePeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end' | null>(null);
  const [tempRange, setTempRange] = useState<DateRange>({
    start: subDays(new Date(), 7),
    end: new Date(),
  });
  const [viewMonth, setViewMonth] = useState(new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelecting(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = useCallback((preset: TimePeriod) => {
    onChange(preset);
    setIsOpen(false);
    setSelecting(null);
  }, [onChange]);

  const handleDateClick = useCallback((date: Date) => {
    if (!selecting) {
      setSelecting('end');
      setTempRange({ start: date, end: date });
    } else if (selecting === 'end') {
      const finalRange: DateRange = isAfter(date, tempRange.start)
        ? { start: tempRange.start, end: date }
        : { start: date, end: tempRange.start };
      setTempRange(finalRange);
      setSelecting(null);
      onChange('custom', finalRange);
      setIsOpen(false);
    }
  }, [selecting, tempRange.start, onChange]);

  const handleStartDateClick = useCallback(() => {
    setSelecting('start');
    setIsOpen(true);
  }, []);

  const handleEndDateClick = useCallback(() => {
    setSelecting('end');
    setIsOpen(true);
  }, []);

  const navigateMonth = useCallback((direction: -1 | 1) => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }, []);

  // Memoized calendar data
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [viewMonth]);

  const getDisplayLabel = useMemo(() => {
    if (value === 'custom' && customRange) {
      return `${format(customRange.start, 'MMM d')} - ${format(customRange.end, 'MMM d, yyyy')}`;
    }
    return PRESETS.find(p => p.id === value)?.label || 'Select Period';
  }, [value, customRange]);

  const isInRange = useCallback((date: Date) => {
    if (!tempRange.start || !tempRange.end) return false;
    return (isAfter(date, tempRange.start) || isSameDay(date, tempRange.start)) &&
           (isBefore(date, tempRange.end) || isSameDay(date, tempRange.end));
  }, [tempRange]);

  const today = useMemo(() => new Date(), []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 md:px-4 py-2 font-bold text-sm transition-all border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <span className="text-zinc-400">📅</span>
        <span className="text-white hidden sm:inline">{getDisplayLabel}</span>
        <span className="text-white sm:hidden">
          {value === 'custom' && customRange
            ? `${format(customRange.start, 'M/d')} - ${format(customRange.end, 'M/d')}`
            : PRESETS.find(p => p.id === value)?.label || 'Period'
          }
        </span>
        <span className="text-zinc-400 ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-2xl z-50 min-w-[280px] md:min-w-[320px] animate-slide-down">
          {/* Quick Presets */}
          <div className="p-2 border-b border-zinc-700">
            <div className="text-xs text-zinc-500 uppercase font-bold px-2 py-1 mb-1">Quick Select</div>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    value === preset.id
                      ? 'bg-red-500 text-white'
                      : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Range */}
          <div className="p-2 border-b border-zinc-700">
            <div className="text-xs text-zinc-500 uppercase font-bold px-2 py-1 mb-2">Custom Range</div>
            <div className="flex items-center gap-2 px-2">
              <button
                onClick={handleStartDateClick}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                  selecting === 'start'
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                {tempRange.start ? format(tempRange.start, 'MMM d, yyyy') : 'Start Date'}
              </button>
              <span className="text-zinc-500">→</span>
              <button
                onClick={handleEndDateClick}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                  selecting === 'end'
                    ? 'border-red-500 bg-red-500/20 text-white'
                    : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                }`}
              >
                {tempRange.end ? format(tempRange.end, 'MMM d, yyyy') : 'End Date'}
              </button>
            </div>
          </div>

          {/* Calendar */}
          <div className="p-3">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                aria-label="Previous month"
              >
                ←
              </button>
              <span className="font-bold text-white">
                {format(viewMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white transition-colors"
                aria-label="Next month"
              >
                →
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_HEADERS.map((day) => (
                <div key={day} className="text-center text-xs text-zinc-500 py-1 font-medium">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="w-8 h-8" />;
                }

                const inRange = isInRange(date);
                const isStart = tempRange.start && isSameDay(date, tempRange.start);
                const isEnd = tempRange.end && isSameDay(date, tempRange.end);
                const isToday = isSameDay(date, today);
                const isFuture = isAfter(date, today);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isFuture && handleDateClick(date)}
                    disabled={isFuture}
                    className={`
                      w-8 h-8 text-sm rounded transition-all
                      ${isFuture ? 'text-zinc-600 cursor-not-allowed' : 'hover:bg-zinc-600 cursor-pointer'}
                      ${inRange && !isStart && !isEnd ? 'bg-red-500/30 text-white' : ''}
                      ${isStart || isEnd ? 'bg-red-500 text-white font-bold' : ''}
                      ${!inRange && !isStart && !isEnd && !isFuture ? 'text-zinc-300' : ''}
                      ${isToday && !isStart && !isEnd ? 'ring-1 ring-zinc-500' : ''}
                    `}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          {selecting && (
            <div className="px-4 py-2 bg-zinc-800 text-center text-xs text-zinc-400 rounded-b-xl border-t border-zinc-700">
              {selecting === 'start' ? 'Click to select start date' : 'Click to select end date'}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default TimePeriodSelector;
