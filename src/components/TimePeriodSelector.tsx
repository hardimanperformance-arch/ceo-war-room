'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfDay, isAfter, isBefore, isSameDay } from 'date-fns';

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

interface TimePeriodSelectorProps {
  value: TimePeriod;
  customRange: DateRange | null;
  onChange: (period: TimePeriod, range?: DateRange) => void;
}

const presets = [
  { id: 'today' as TimePeriod, label: 'Today' },
  { id: 'week' as TimePeriod, label: 'This Week' },
  { id: 'month' as TimePeriod, label: 'This Month' },
  { id: 'year' as TimePeriod, label: 'This Year' },
];

export default function TimePeriodSelector({ value, customRange, onChange }: TimePeriodSelectorProps) {
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

  const handlePresetClick = (preset: TimePeriod) => {
    onChange(preset);
    setIsOpen(false);
    setSelecting(null);
  };

  const handleDateClick = (date: Date) => {
    if (!selecting) {
      // Start new selection
      setSelecting('end');
      setTempRange({ start: date, end: date });
    } else if (selecting === 'end') {
      // Complete selection
      let finalRange: DateRange;
      if (isAfter(date, tempRange.start)) {
        finalRange = { start: tempRange.start, end: date };
      } else {
        finalRange = { start: date, end: tempRange.start };
      }
      setTempRange(finalRange);
      setSelecting(null);
      onChange('custom', finalRange);
      setIsOpen(false);
    }
  };

  const handleStartDateClick = () => {
    setSelecting('start');
    setIsOpen(true);
  };

  const handleEndDateClick = () => {
    setSelecting('end');
    setIsOpen(true);
  };

  const renderCalendar = () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add padding for days before the 1st
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    const isInRange = (date: Date) => {
      if (!tempRange.start || !tempRange.end) return false;
      return (isAfter(date, tempRange.start) || isSameDay(date, tempRange.start)) &&
             (isBefore(date, tempRange.end) || isSameDay(date, tempRange.end));
    };

    const isStart = (date: Date) => tempRange.start && isSameDay(date, tempRange.start);
    const isEnd = (date: Date) => tempRange.end && isSameDay(date, tempRange.end);
    const isToday = (date: Date) => isSameDay(date, new Date());

    return (
      <div className="p-3">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
          >
            ←
          </button>
          <span className="font-bold text-white">
            {format(viewMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
          >
            →
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs text-zinc-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="w-8 h-8" />;
            }
            
            const inRange = isInRange(date);
            const start = isStart(date);
            const end = isEnd(date);
            const today = isToday(date);
            const future = isAfter(date, new Date());

            return (
              <button
                key={date.toISOString()}
                onClick={() => !future && handleDateClick(date)}
                disabled={future}
                className={`
                  w-8 h-8 text-sm rounded transition-all
                  ${future ? 'text-zinc-600 cursor-not-allowed' : 'hover:bg-zinc-600 cursor-pointer'}
                  ${inRange && !start && !end ? 'bg-red-500/30 text-white' : ''}
                  ${start || end ? 'bg-red-500 text-white font-bold' : ''}
                  ${!inRange && !start && !end && !future ? 'text-zinc-300' : ''}
                  ${today && !start && !end ? 'ring-1 ring-zinc-500' : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const getDisplayLabel = () => {
    if (value === 'custom' && customRange) {
      return `${format(customRange.start, 'MMM d')} - ${format(customRange.end, 'MMM d, yyyy')}`;
    }
    return presets.find(p => p.id === value)?.label || 'Select Period';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-2 font-bold text-sm transition-all border border-zinc-700"
      >
        <span className="text-zinc-400">📅</span>
        <span className="text-white">{getDisplayLabel()}</span>
        <span className="text-zinc-400 ml-1">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-zinc-900 border-2 border-zinc-700 rounded-xl shadow-2xl z-50 min-w-[320px]">
          {/* Quick Presets */}
          <div className="p-2 border-b border-zinc-700">
            <div className="text-xs text-zinc-500 uppercase font-bold px-2 py-1 mb-1">Quick Select</div>
            <div className="grid grid-cols-2 gap-1">
              {presets.map((preset) => (
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
          {renderCalendar()}

          {/* Instructions */}
          {selecting && (
            <div className="px-4 py-2 bg-zinc-800 text-center text-xs text-zinc-400 rounded-b-xl">
              {selecting === 'start' ? 'Click to select start date' : 'Click to select end date'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
