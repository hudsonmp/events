"use client"

import { useState, useMemo } from "react"
import type { Event } from "@/lib/types"
import { EventModal } from "./event-modal"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CalendarViewProps {
  events: Event[]
}

export function CalendarView({ events }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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

    // Check if mobile
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768

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
  }, [currentDate, eventsByDate])

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768

      if (isMobile) {
        // Navigate by week on mobile
        if (direction === "prev") {
          newDate.setDate(newDate.getDate() - 7)
        } else {
          newDate.setDate(newDate.getDate() + 7)
        }
      } else {
        // Navigate by month on desktop
        if (direction === "prev") {
          newDate.setMonth(newDate.getMonth() - 1)
        } else {
          newDate.setMonth(newDate.getMonth() + 1)
        }
      }
      return newDate
    })
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

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button onClick={goToToday} variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigateMonth("prev")} variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button onClick={() => navigateMonth("next")} variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden max-w-4xl mx-auto">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b bg-slate-50">
          {(isMobile ? shortDayNames : dayNames).map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-slate-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateString = day.date.toDateString()
            const hasEvents = day.events.length > 0

            return (
              <div
                key={index}
                onClick={() => hasEvents && handleDateClick(dateString)}
                className={`min-h-[60px] md:min-h-[80px] p-2 border-r border-b border-slate-100 flex flex-col items-center justify-between relative ${
                  !day.isCurrentMonth ? "bg-slate-50 text-slate-400" : "bg-white text-slate-700"
                } ${day.isToday ? "bg-blue-50 text-blue-600 font-semibold" : ""} ${
                  hasEvents ? "cursor-pointer hover:bg-slate-50" : ""
                }`}
              >
                <div className="text-sm font-medium">{day.date.getDate()}</div>

                {/* Event dots */}
                {hasEvents && (
                  <div className="flex gap-1 flex-wrap justify-center mt-1">
                    {day.events.slice(0, 4).map((event, eventIndex) => {
                      // Get category color
                      const category = event.categories?.[0]?.category?.name || "event"
                      const categoryColors = {
                        event: "bg-blue-500",
                        club: "bg-purple-500",
                        sport: "bg-green-500",
                        deadline: "bg-red-500",
                        meeting: "bg-yellow-500",
                      }
                      const dotColor = categoryColors[category as keyof typeof categoryColors] || "bg-blue-500"

                      return (
                        <div
                          key={eventIndex}
                          className={`w-2 h-2 rounded-full ${dotColor}`}
                          title={event.name || "Event"}
                        />
                      )
                    })}
                    {day.events.length > 4 && (
                      <div className="text-xs text-slate-500 ml-1">+{day.events.length - 4}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && eventsByDate[selectedDate] && (
        <div className="bg-white rounded-lg border shadow-sm p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Events on{" "}
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>
          <div className="space-y-3">
            {eventsByDate[selectedDate].map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-800">{event.name}</h4>
                    <div className="text-sm text-slate-600 flex items-center gap-4">
                      {event.start_datetime && !event.is_all_day && (
                        <span>
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
                  <div className="flex gap-1">
                    {event.categories?.slice(0, 2).map(({ category }) => (
                      <span
                        key={category.name}
                        className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full capitalize"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setSelectedDate(null)} className="mt-4 text-sm text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>
      )}

      <EventModal event={selectedEvent} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  )
}
