"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Check } from "lucide-react";
import { parseBillDate } from "@/lib/utils";

interface DatePickerProps {
  value: string; // Expected in DD-MM-YYYY
  onChange: (dateStr: string) => void;
  label?: string;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const selectedDate = parseBillDate(value);
  
  // View month & year currently displayed in the calendar
  const [viewDate, setViewDate] = useState<Date>(() => {
    return isNaN(selectedDate.getTime()) ? new Date() : selectedDate;
  });

  // Keep viewDate in sync when value changes externally
  useEffect(() => {
    const parsed = parseBillDate(value);
    if (!isNaN(parsed.getTime())) {
      setViewDate(parsed);
    }
  }, [value]);

  // Click outside to close smoothly
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const dayStr = String(d.getDate()).padStart(2, "0");
    const monthStr = String(d.getMonth() + 1).padStart(2, "0");
    const yearStr = d.getFullYear();
    const formatted = `${dayStr}-${monthStr}-${yearStr}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleSelectPreset = (daysOffset: number = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const dayStr = String(d.getDate()).padStart(2, "0");
    const monthStr = String(d.getMonth() + 1).padStart(2, "0");
    const yearStr = d.getFullYear();
    const formatted = `${dayStr}-${monthStr}-${yearStr}`;
    onChange(formatted);
    setViewDate(d);
    setIsOpen(false);
  };

  // Build grid days
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 for Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isSelected = (day: number) =>
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Interactive Input trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-3.5 pr-3 py-2.5 bg-white border rounded-xl text-sm font-semibold cursor-pointer transition-all select-none shadow-xs hover:border-green-500 ${
          isOpen
            ? "border-green-600 ring-2 ring-green-500/20 shadow-sm"
            : "border-gray-300 hover:bg-gray-50/50"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <CalendarIcon className={`w-4 h-4 transition-colors ${isOpen ? "text-green-600" : "text-gray-400"}`} />
          <span className="text-gray-900 font-bold tracking-wide">
            {value || "Select Date"}
          </span>
        </div>
        <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
          Change
        </span>
      </div>

      {/* Smooth Animated Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 sm:left-auto sm:right-0 w-[300px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header Month / Year & Nav */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <span className="text-sm font-bold text-gray-900">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            {DAYS_OF_WEEK.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs">
            {/* Previous month padding days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = prevMonthDays - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="p-2 text-center text-gray-300 font-medium select-none"
                >
                  {dayNum}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const currentToday = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl font-bold transition-all cursor-pointer ${
                    selected
                      ? "bg-green-600 text-white shadow-md shadow-green-200 scale-105"
                      : currentToday
                      ? "bg-green-50 text-green-800 border border-green-300 hover:bg-green-100"
                      : "text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Preset Buttons (Today, Yesterday) */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => handleSelectPreset(0)}
              className="px-2.5 py-1 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset(-1)}
              className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset(-2)}
              className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              2 Days Ago
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
