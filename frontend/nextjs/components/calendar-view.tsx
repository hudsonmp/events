"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react"
import { Event } from "@/lib/types"
import { EventModal } from "./event-modal"
import { useIsMobile } from "@/hooks/use-mobile"

interface CalendarViewProps {
  events: Event[]
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const isMobile = useIsMobile()

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

    // Sort events within each day by time
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        if (!a.start_datetime) return 1
        if (!b.start_datetime) return -1
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      })
    })

    return grouped
  }, [events])

  // Get calendar days for current month (desktop) or week (mobile)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    if (isMobile) {
      // Week view for mobile
      const startOfWeek = new Date(currentDate)
      const day = startOfWeek.getDay()
      startOfWeek.setDate(startOfWeek.getDate() - day)

      const days = []
      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek)
        currentDay.setDate(startOfWeek.getDate() + i)
        const dateString = currentDay.toDateString()
        const eventsForDay = eventsByDate[dateString] || []

        days.push({
          date: new Date(currentDay),
          isCurrentMonth: true,
          isToday: currentDay.toDateString() === new Date().toDateString(),
          events: eventsForDay,
        })
      }
      return days
    } else {
      // Month view for desktop
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
    }
  }, [currentDate, eventsByDate, isMobile])

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)
    if (isMobile) {
      // Navigate by week on mobile
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
    } else {
      // Navigate by month on desktop
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1), 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleDateClick = (dateString: string) => {
    const dayEvents = eventsByDate[dateString] || []
    if (dayEvents.length === 1) {
      handleEventClick(dayEvents[0])
    } else if (dayEvents.length > 1) {
      setSelectedDate(dateString)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
    setSelectedDate(null)
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const shortDayNames = ["S", "M", "T", "W", "T", "F", "S"]

  return (
    <div className="space-y-8 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-amber-50 p-6 rounded-2xl shadow-sm border border-emerald-100">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-700 to-amber-600 bg-clip-text text-transparent">
            {isMobile 
              ? `Week of ${calendarDays[0]?.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
              : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            }
          </h2>
                     <button 
             onClick={goToToday} 
             className="px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg transition-colors flex items-center gap-2"
           >
             <Calendar className="w-4 h-4" />
             Today
           </button>
         </div>
         <div className="flex items-center gap-2">
           <button 
             onClick={() => navigateMonth("prev")} 
             className="p-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg transition-colors"
           >
             <ChevronLeft className="w-4 h-4" />
           </button>
           <button 
             onClick={() => navigateMonth("next")} 
             className="p-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg transition-colors"
           >
             <ChevronRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {isMobile ? (
        /* Mobile Week View - Clean List Style */
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden max-w-md mx-auto">
          <div className="bg-gradient-to-r from-emerald-600 to-amber-600 p-4 text-center">
            <h3 className="text-white font-semibold text-lg">
              Week of {calendarDays[0]?.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </h3>
          </div>
          
          <div className="p-4 space-y-4">
            {calendarDays.map((day, index) => {
              const dateString = day.date.toDateString()
              const hasEvents = day.events.length > 0
              const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.date.getDay()]

              return (
                <div
                  key={index}
                  onClick={() => hasEvents && handleDateClick(dateString)}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-200 ${
                    day.isToday 
                      ? "bg-gradient-to-r from-emerald-50 to-amber-50 border-2 border-emerald-200" 
                      : "bg-gray-50 hover:bg-gray-100"
                  } ${hasEvents ? "cursor-pointer" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${
                      day.isToday ? "text-emerald-700" : "text-gray-800"
                    }`}>
                      {day.date.getDate()}
                    </div>
                    <div className={`text-sm font-medium ${
                      day.isToday ? "text-emerald-600" : "text-gray-600"
                    }`}>
                      {dayName}
                    </div>
                  </div>

                  {/* Event indicators */}
                  <div className="flex items-center gap-2">
                    {hasEvents ? (
                      <>
                        <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"></div>
                        {day.events.length > 1 && (
                          <div className="text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-1 rounded-full">
                            +{day.events.length - 1} more
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Desktop Month View - Clean Grid Style with Dots */
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden max-w-6xl mx-auto">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gradient-to-r from-emerald-600 to-amber-600">
            {dayNames.map((day) => (
              <div key={day} className="p-4 text-center text-sm font-semibold text-white">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {calendarDays.map((day, index) => {
              const dateString = day.date.toDateString()
              const hasEvents = day.events.length > 0

              return (
                <div
                  key={index}
                  onClick={() => hasEvents && handleDateClick(dateString)}
                  className={`min-h-[120px] p-4 flex flex-col items-center justify-start relative transition-all duration-200 ${
                    !day.isCurrentMonth 
                      ? "bg-gray-50 text-gray-400" 
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } ${
                    day.isToday 
                      ? "bg-gradient-to-br from-emerald-50 to-amber-50 text-emerald-800 font-semibold" 
                      : ""
                  } ${
                    hasEvents 
                      ? "cursor-pointer hover:bg-emerald-25 hover:shadow-md" 
                      : ""
                  }`}
                >
                  {/* Day Number */}
                  <div className={`text-lg font-bold mb-3 ${
                    day.isToday 
                      ? 'bg-gradient-to-r from-emerald-600 to-amber-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm' 
                      : day.isCurrentMonth 
                        ? 'text-gray-800' 
                        : 'text-gray-400'
                  }`}>
                    {day.date.getDate()}
                  </div>

                  {/* Event indicators */}
                  <div className="flex flex-col items-center gap-2 w-full">
                    {hasEvents ? (
                      <>
                        <div className="w-4 h-4 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full shadow-sm"></div>
                        {day.events.length > 1 && (
                          <div className="text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-1 rounded-full">
                            +{day.events.length - 1} more
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Selected Date Events */}
      {selectedDate && eventsByDate[selectedDate] && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">
            Events on{" "}
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>
          <div className="space-y-4">
            {eventsByDate[selectedDate].map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="p-4 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-amber-50 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-lg">{event.name}</h4>
                    <div className="text-sm text-gray-600 flex items-center gap-4 mt-2">
                      {event.start_datetime && !event.is_all_day && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.start_datetime).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      )}
                      {event.location_name && <span>📍 {event.location_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {event.categories?.slice(0, 2).map(({ category }) => (
                      <span
                        key={category.name}
                        className="px-3 py-1 bg-gradient-to-r from-emerald-100 to-amber-100 text-emerald-800 text-xs rounded-full capitalize font-medium"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setSelectedDate(null)} 
            className="mt-6 text-sm text-gray-500 hover:text-emerald-600 transition-colors font-medium"
          >
            ← Close
          </button>
        </div>
      )}

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  )
}
