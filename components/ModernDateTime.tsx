
import React, { useState, useEffect, useRef } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from './Icons';

// --- Helper Functions ---
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

// --- Modern Date Picker ---
interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
}

export const ModernDatePicker = ({ value, onChange, label }: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Parse initial value or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate); // For navigation
  const selectedDate = value ? new Date(value) : new Date();

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  useEffect(() => {
    // Close on click outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleDayClick = (day: number) => {
    // Construct YYYY-MM-DD in local time
    const d = new Date(currentYear, currentMonth, day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const displayValue = value 
    ? new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Select date';

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-all ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'
        } bg-white`}
      >
        <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}>{displayValue}</span>
        <CalendarIcon className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRightIcon className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} className="text-[10px] text-gray-400 font-medium">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {blanks.map((_, i) => <div key={`blank-${i}`} />)}
            {days.map(day => {
               const isSelected = 
                 day === selectedDate.getDate() && 
                 currentMonth === selectedDate.getMonth() && 
                 currentYear === selectedDate.getFullYear();
               
               const isToday = 
                 day === new Date().getDate() && 
                 currentMonth === new Date().getMonth() && 
                 currentYear === new Date().getFullYear();

               return (
                 <button
                   key={day}
                   type="button"
                   onClick={() => handleDayClick(day)}
                   className={`h-8 w-8 rounded text-xs font-medium flex items-center justify-center transition-colors
                     ${isSelected 
                       ? 'bg-blue-600 text-white shadow-md' 
                       : isToday 
                         ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                         : 'text-gray-700 hover:bg-gray-100'
                     }`}
                 >
                   {day}
                 </button>
               )
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Modern Time Picker ---
interface TimePickerProps {
  value: string; // HH:mm
  onChange: (time: string) => void;
  label?: string;
}

export const ModernTimePicker = ({ value, onChange, label }: TimePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [hours, minutes] = value.split(':');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleHourClick = (h: string) => {
    onChange(`${h}:${minutes}`);
  };

  const handleMinuteClick = (m: string) => {
    onChange(`${hours}:${m}`);
    setIsOpen(false); // Auto close after minute selection for speed
  };

  // Generate arrays
  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutesList = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // Steps of 5 for speed
  // Add exact minute if not in list
  if (!minutesList.includes(minutes)) minutesList.push(minutes);
  minutesList.sort();

  return (
    <div className="relative" ref={wrapperRef}>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg transition-all ${
          isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'
        } bg-white`}
      >
        <span className="text-sm text-gray-900 font-mono tracking-wider">{value}</span>
        <ClockIcon className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-0 overflow-hidden flex h-48 animate-fade-in-up">
           {/* Hours Column */}
           <div className="flex-1 overflow-y-auto no-scrollbar border-r border-gray-100">
              <div className="px-2 py-1 bg-gray-50 text-[10px] text-gray-500 font-bold uppercase sticky top-0">Hr</div>
              {hoursList.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleHourClick(h)}
                    className={`w-full text-center py-2 text-sm font-medium hover:bg-gray-50 ${hours === h ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700'}`}
                  >
                      {h}
                  </button>
              ))}
           </div>
           
           {/* Minutes Column */}
           <div className="flex-1 overflow-y-auto no-scrollbar">
              <div className="px-2 py-1 bg-gray-50 text-[10px] text-gray-500 font-bold uppercase sticky top-0">Min</div>
              {minutesList.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMinuteClick(m)}
                    className={`w-full text-center py-2 text-sm font-medium hover:bg-gray-50 ${minutes === m ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700'}`}
                  >
                      {m}
                  </button>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};
