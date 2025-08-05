"use client"

import { useState, useEffect } from "react"
import { EventCard } from "@/components/event-card"
import { EventModal } from "@/components/event-modal"
import { createClient } from "@/lib/supabase/client"
import type { Event } from "@/lib/types"
import { TrendingUp } from "lucide-react"

interface TrendingEventsProps {
  initialEvents: Event[]
  selectedCategoryId?: string | null
  selectedCategoryName?: string | null
  selectedTag?: string | null
  onClearFilter?: () => void
}

export function TrendingEvents({ initialEvents, selectedCategoryId, selectedCategoryName, selectedTag, onClearFilter }: TrendingEventsProps) {
  const [allEvents, setAllEvents] = useState<Event[]>(initialEvents)
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
            attendees:event_attendees(user_id)
          `)
          .eq("status", "active")
          .gte("start_datetime", new Date().toISOString())
          .limit(20)

        if (data && !error) {
          // Sort by attendee count (most RSVPs first)
          const sortedData = data.sort((a, b) => {
            const aCount = a.attendees?.length || 0
            const bCount = b.attendees?.length || 0
            return bCount - aCount
          })
          setAllEvents(sortedData)
        }
      } catch (error) {
        console.error("Error fetching trending events:", error)
      }
    }

    fetchTrendingEvents()
    // Refresh trending events periodically
    const interval = setInterval(fetchTrendingEvents, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [supabase])

  // Filter events when category or tag changes
  useEffect(() => {
    let filteredEvents = allEvents

    // Filter by category if selected
    if (selectedCategoryId) {
      filteredEvents = filteredEvents.filter(event => 
        event.categories?.some(cat => cat.category.id === selectedCategoryId)
      )
    }

    // Filter by tag if selected
    if (selectedTag) {
      filteredEvents = filteredEvents.filter(event => 
        event.tags?.some(tag => tag.tag.toLowerCase() === selectedTag.toLowerCase())
      )
    }

    setEvents(filteredEvents)
  }, [allEvents, selectedCategoryId, selectedTag])

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
            <h2 className="text-xl font-bold text-gray-900">
              {selectedCategoryName 
                ? `${selectedCategoryName} Events` 
                : selectedTag 
                  ? `#${selectedTag} Events`
                  : 'Trending Events'
              }
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(selectedCategoryId || selectedTag) && (
              <button 
                onClick={onClearFilter}
                className="text-gray-500 text-sm font-medium hover:text-gray-700 bg-gray-100 px-3 py-1 rounded-full"
              >
                Clear Filter
              </button>
            )}
            <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
              View All
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 hover:scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(209 213 219) transparent' }}>
          {events.slice(0, 8).map((event) => (
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