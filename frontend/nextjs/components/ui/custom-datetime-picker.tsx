"use client"

import { useState, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, Clock, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import DatePicker from "react-datepicker"
import { format, setHours, setMinutes } from "date-fns"

// Custom CSS for react-datepicker
import "react-datepicker/dist/react-datepicker.css"

interface CustomDateTimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// Custom input component that matches our design
const CustomInput = forwardRef<HTMLButtonElement, any>(({ value, onClick, placeholder }, ref) => (
  <Button
    ref={ref}
    variant="outline"
    onClick={onClick}
    className={cn(
      "w-full justify-start bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:border-slate-600 rounded-xl h-11",
      !value && "text-slate-400"
    )}
  >
    <CalendarIcon className="mr-2 h-4 w-4" />
    {value || placeholder}
    <ChevronDown className="ml-auto h-4 w-4" />
  </Button>
))
CustomInput.displayName = "CustomInput"

export function CustomDateTimePicker({ 
  value, 
  onChange, 
  placeholder = "Select date and time",
  className 
}: CustomDateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  )

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date)
      onChange(date.toISOString())
    } else {
      setSelectedDate(null)
      onChange('')
    }
  }

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder
    
    const date = format(selectedDate, 'EEE, MMM d')
    const time = format(selectedDate, 'h:mm a')
    
    return `${date} at ${time}`
  }

  // Quick time options
  const timeOptions = [
    { label: "9:00 AM", hours: 9, minutes: 0 },
    { label: "12:00 PM", hours: 12, minutes: 0 },
    { label: "3:00 PM", hours: 15, minutes: 0 },
    { label: "5:00 PM", hours: 17, minutes: 0 },
    { label: "7:00 PM", hours: 19, minutes: 0 },
    { label: "8:00 PM", hours: 20, minutes: 0 },
  ]

  const setQuickTime = (hours: number, minutes: number) => {
    if (selectedDate) {
      const newDate = setMinutes(setHours(selectedDate, hours), minutes)
      handleDateChange(newDate)
    } else {
      // If no date selected, use today with the selected time
      const today = new Date()
      const newDate = setMinutes(setHours(today, hours), minutes)
      handleDateChange(newDate)
    }
  }

  const CustomHeader = ({ date, decreaseMonth, increaseMonth }: any) => (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white rounded-t-xl">
      <button
        onClick={decreaseMonth}
        className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
        type="button"
      >
        <ChevronDown className="h-4 w-4 rotate-90" />
      </button>
      <span className="font-semibold text-lg">
        {format(date, 'MMMM yyyy')}
      </span>
      <button
        onClick={increaseMonth}
        className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
        type="button"
      >
        <ChevronDown className="h-4 w-4 -rotate-90" />
      </button>
    </div>
  )

  return (
    <div className={cn("w-full", className)}>
      <style jsx global>{`
        .react-datepicker {
          background-color: #1e293b !important;
          border: 1px solid #475569 !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          font-family: inherit !important;
        }
        
        .react-datepicker__header {
          background-color: #334155 !important;
          border-bottom: 1px solid #475569 !important;
          border-radius: 12px 12px 0 0 !important;
          padding: 0 !important;
        }
        
        .react-datepicker__current-month {
          color: white !important;
          font-weight: 600 !important;
          margin-bottom: 8px !important;
        }
        
        .react-datepicker__day-names {
          margin-bottom: 8px !important;
        }
        
        .react-datepicker__day-name {
          color: #94a3b8 !important;
          font-weight: 500 !important;
          width: 2.2rem !important;
          line-height: 2.2rem !important;
        }
        
        .react-datepicker__month-container {
          background-color: #1e293b !important;
          border-radius: 12px !important;
        }
        
        .react-datepicker__month {
          margin: 0 !important;
          padding: 12px !important;
          background-color: #1e293b !important;
        }
        
        .react-datepicker__week {
          display: flex !important;
          justify-content: space-around !important;
        }
        
        .react-datepicker__day {
          color: white !important;
          width: 2.2rem !important;
          line-height: 2.2rem !important;
          text-align: center !important;
          border-radius: 8px !important;
          margin: 2px !important;
          transition: all 0.2s ease !important;
        }
        
        .react-datepicker__day:hover {
          background-color: #475569 !important;
          color: white !important;
        }
        
        .react-datepicker__day--selected {
          background-color: #2563eb !important;
          color: white !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__day--today {
          background-color: #334155 !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__day--outside-month {
          color: #64748b !important;
        }
        
        .react-datepicker__time-container {
          background-color: #1e293b !important;
          border-left: 1px solid #475569 !important;
          border-radius: 0 12px 12px 0 !important;
        }
        
        .react-datepicker__time {
          background-color: #1e293b !important;
          border-radius: 0 12px 12px 0 !important;
        }
        
        .react-datepicker__header--time {
          background-color: #334155 !important;
          border-bottom: 1px solid #475569 !important;
          color: white !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__time-box {
          background-color: #1e293b !important;
        }
        
        .react-datepicker__time-list {
          background-color: #1e293b !important;
        }
        
        .react-datepicker__time-list-item {
          color: white !important;
          padding: 8px 12px !important;
          transition: all 0.2s ease !important;
        }
        
        .react-datepicker__time-list-item:hover {
          background-color: #475569 !important;
        }
        
        .react-datepicker__time-list-item--selected {
          background-color: #2563eb !important;
          color: white !important;
          font-weight: 600 !important;
        }
        
        .react-datepicker__triangle {
          display: none !important;
        }
        
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
        
        .react-datepicker-popper[data-placement^="bottom"] {
          margin-top: 8px !important;
        }
        
        .react-datepicker-wrapper {
          display: block !important;
          width: 100% !important;
        }
        
        .quick-times {
          padding: 12px;
          border-top: 1px solid #475569;
          background-color: #1e293b;
          border-radius: 0 0 12px 12px;
        }
        
        .quick-times-title {
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .quick-times-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        
        .quick-time-btn {
          background-color: #334155;
          color: #e2e8f0;
          border: 1px solid #475569;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .quick-time-btn:hover {
          background-color: #475569;
          color: white;
          border-color: #64748b;
        }
      `}</style>
      
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        showTimeSelect
        timeFormat="h:mm aa"
        timeIntervals={15}
        dateFormat="MMMM d, yyyy h:mm aa"
        customInput={<CustomInput placeholder={placeholder} />}
        renderCustomHeader={CustomHeader}
        popperClassName="react-datepicker-popper"
        calendarClassName="react-datepicker-calendar"
        popperPlacement="bottom-start"
        showPopperArrow={false}
      >
        <div className="quick-times">
          <div className="quick-times-title">Quick times</div>
          <div className="quick-times-grid">
            {timeOptions.map((time) => (
              <button
                key={time.label}
                type="button"
                className="quick-time-btn"
                onClick={() => setQuickTime(time.hours, time.minutes)}
              >
                {time.label}
              </button>
            ))}
          </div>
        </div>
      </DatePicker>
    </div>
  )
} 