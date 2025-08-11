"use client"

import { useState, useEffect } from "react"
import { EventCard } from "@/components/event-card"
import { EventModal } from "@/components/event-modal"
import { AuthModal } from "@/components/auth-modal"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/contexts/auth-context"
import type { Event } from "@/lib/types"
import { User, ChevronRight, Calendar } from "lucide-react"
import Link from "next/link"

export function MyEventsHorizontal() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setEvents([])
      return
    }

    const fetchMyEvents = async () => {
      setLoading(true)
      try {
        const now = new Date().toISOString()
        
        const { data, error } = await supabase
          .from("event_attendees")
          .select(`
            event_id,
            events!inner(
              *,
              categories:event_categories(category:categories(id, name)),
              tags:event_tags(tag),
              profile:profiles!events_profile_id_fkey(username, profile_pic_url, bio),
              school:schools(name, address),
              post:posts!post_id(
                post_images(file_path)
              ),
              event_images:event_images(
                image:images(id, storage_path, url)
              )
            )
          `)
          .eq("user_id", user.id)
          .eq("events.status", "active")
          .gte("events.start_datetime", now)
          .limit(10)

        if (data && !error) {
          const userEvents = data.map((item: any) => item.events).filter(Boolean)
          // Sort by start date
          const sortedEvents = userEvents.sort((a, b) => {
            if (!a.start_datetime || !b.start_datetime) return 0
            return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          })
          setEvents(sortedEvents)
        }
      } catch (error) {
        console.error("Error fetching user events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMyEvents()
  }, [user, supabase])

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvent(null)
  }

  const handleAuthPrompt = () => {
    setShowAuthModal(true)
  }

  if (!user) {
    return (
      <>
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">My Events</h2>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to see your events</h3>
            <p className="text-gray-600 mb-4">View and manage events you've RSVP'd to</p>
            <button
              onClick={handleAuthPrompt}
              className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          defaultTab="signin"
        />
      </>
    )
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">My Events</h2>
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-80 bg-gray-200 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">My Events</h2>
          </div>
          <Link href="/events/my-events" className="text-blue-600 text-sm font-medium hover:text-blue-700">
            View All
          </Link>
        </div>
        
        <div className="bg-gray-50 rounded-2xl p-6 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
          <p className="text-gray-600">RSVP to events to see them here</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">My Events</h2>
          </div>
          <Link href="/events/my-events" className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-700">
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 hover:scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(209 213 219) transparent' }}>
          {events.map((event) => (
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