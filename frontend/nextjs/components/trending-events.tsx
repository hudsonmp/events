"use client"

import { useState, useEffect } from "react"
import { EventCard } from "@/components/event-card"
import { EventModal } from "@/components/event-modal"
import { createClient } from "@/lib/supabase/client"
import type { Event } from "@/lib/types"
import { TrendingUp } from "lucide-react"

interface TrendingEventsProps {
  initialEvents: Event[]
}

export function TrendingEvents({ initialEvents }: TrendingEventsProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchTrendingEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select(`
            *,
            categories:event_categories(category:categories(id, name)),
            tags:event_tags(tag),
            profile:profiles(username, profile_pic_url, bio),
            school:schools(name, address),
            post:posts!post_id(
              post_images(file_path)
            ),
            event_images:event_images(
              image:images(id, storage_path, url)
            ),
            attendee_count:event_attendees(count)
          `)
          .eq("status", "active")
          .gte("start_datetime", new Date().toISOString())
          .order("attendee_count", { ascending: false })
          .limit(6)

        if (data && !error) {
          setEvents(data)
        }
      } catch (error) {
        console.error("Error fetching trending events:", error)
      }
    }

    // Refresh trending events periodically
    const interval = setInterval(fetchTrendingEvents, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [supabase])

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  if (events.length === 0) {
    return null
  }

  return (
    <>
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">Trending Events</h2>
          </div>
          <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
            View All
          </button>
        </div>
        
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {events.slice(0, 6).map((event) => (
            <div key={event.id} className="flex-shrink-0 w-80">
              <EventCard
                event={event}
                onClick={() => handleEventClick(event)}
              />
            </div>
          ))}
        </div>
      </div>

      <EventModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}