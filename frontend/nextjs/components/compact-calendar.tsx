"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react"
import { Event } from "@/lib/types"

interface CompactCalendarProps {
  events: Event[]
  onDateClick?: (dateString: string, events: Event[]) => void
}

export function CompactCalendar({ events, onDateClick }: CompactCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {}

    events.forEach((event) => {
      if (event.start_datetime) {
        const date = new Date(event.start_datetime).toDateString()
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(event)
      }
    })

    return grouped
  }, [events])

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const currentDay = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      const dateString = currentDay.toDateString()
      const eventsForDay = eventsByDate[dateString] || []

      days.push({
        date: new Date(currentDay),
        isCurrentMonth: currentDay.getMonth() === month,
        isToday: currentDay.toDateString() === new Date().toDateString(),
        events: eventsForDay,
      })

      currentDay.setDate(currentDay.getDate() + 1)
    }
    return days
  }, [currentDate, eventsByDate])

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1), 1)
    setCurrentDate(newDate)
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

  const handleDateClick = (dateString: string, dayEvents: Event[]) => {
    setSelectedDate(dateString)
    if (onDateClick) {
      onDateClick(dateString, dayEvents)
    }
  }

  // Get events for selected date
  const selectedDateEvents = selectedDate ? eventsByDate[selectedDate] || [] : []

  // Format date for display
  const formatSelectedDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "long", 
      day: "numeric",
      year: "numeric"
    })
  }

  // Format time for event display
  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800">
            {isCollapsed && selectedDate 
              ? formatSelectedDate(selectedDate).split(',')[0] // Show "Monday, January 15" when collapsed
              : monthNames[currentDate.getMonth()]
            }
          </h3>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={isCollapsed ? "Show calendar" : "Hide calendar"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => navigateMonth("next")}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Calendar Grid - Only show when not collapsed */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
        isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
      }`}>
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day, index) => (
            <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const dateString = day.date.toDateString()
            const hasEvents = day.events.length > 0

            return (
              <div
                key={index}
                onClick={() => handleDateClick(dateString, day.events)}
                className={`
                  aspect-square flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 rounded cursor-pointer
                  ${!day.isCurrentMonth 
                    ? "text-gray-300 hover:bg-gray-50" 
                    : "text-gray-700 hover:bg-gray-50"
                  } 
                  ${day.isToday 
                    ? "bg-gradient-to-r from-emerald-100 to-amber-100 text-emerald-700 font-semibold" 
                    : ""
                  } 
                  ${selectedDate === dateString
                    ? "bg-emerald-200 text-emerald-800 font-semibold"
                    : ""
                  }
                  ${hasEvents ? "hover:bg-emerald-50" : ""}
                `}
              >
                <div className="mb-1">{day.date.getDate()}</div>
                
                {/* Event indicator */}
                {hasEvents ? (
                  <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"></div>
                ) : (
                  <div className="w-1.5 h-1.5"></div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Date Events Display - Always visible */}
      {selectedDate && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            {formatSelectedDate(selectedDate)}
          </h4>
          
          {selectedDateEvents.length > 0 ? (
            <div className="max-h-64 overflow-y-auto space-y-3">
              {selectedDateEvents.map((event) => (
                <div key={event.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <h5 className="font-medium text-gray-800 line-clamp-2 mb-2">
                    {event.name || "Untitled Event"}
                  </h5>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    {event.start_datetime && !event.is_all_day && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(event.start_datetime)}</span>
                      </div>
                    )}
                    
                    {event.location_name && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{event.location_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No events on this day</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 