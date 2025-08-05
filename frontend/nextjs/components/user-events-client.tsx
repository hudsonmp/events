"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { type Event } from "@/lib/types"
import { EventCard } from "./event-card"
import { EventModal } from "./event-modal"
import { AuthModal } from "./auth-modal"
import { useAuth } from "@/lib/contexts/auth-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, History, Users } from "lucide-react"

interface UserEventsClientProps {
  initialUpcoming: Event[]
  initialPast: Event[]
}

export function UserEventsClient({ initialUpcoming, initialPast }: UserEventsClientProps) {
  const { user } = useAuth()
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>(initialUpcoming)
  const [pastEvents, setPastEvents] = useState<Event[]>(initialPast)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const supabase = createClient()

  // Refresh user events when attendance changes
  useEffect(() => {
    if (!user) return

    const fetchUserEvents = async () => {
      const now = new Date().toISOString()

      const { data: attendeeData } = await supabase
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

      if (attendeeData) {
        const allEvents: Event[] = attendeeData.map((item: any) => item.events).filter(Boolean) || []

        const upcoming = allEvents.filter(event => 
          event.start_datetime && new Date(event.start_datetime) >= new Date(now)
        ).sort((a, b) => 
          new Date(a.start_datetime || 0).getTime() - new Date(b.start_datetime || 0).getTime()
        )

        const past = allEvents.filter(event => 
          event.start_datetime && new Date(event.start_datetime) < new Date(now)
        ).sort((a, b) => 
          new Date(b.start_datetime || 0).getTime() - new Date(a.start_datetime || 0).getTime()
        )

        setUpcomingEvents(upcoming)
        setPastEvents(past)
      }
    }

    // Listen for changes in event_attendees table
    const channel = supabase
      .channel("user-events-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_attendees", filter: `user_id=eq.${user.id}` },
        () => {
          fetchUserEvents()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
    setAuthModalOpen(true)
  }

  const EventGrid = ({ events, emptyMessage }: { events: Event[], emptyMessage: string }) => (
    events.length > 0 ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
        ))}
      </div>
    ) : (
      <div className="text-center py-16">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <CalendarDays className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Events</h3>
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    )
  )

  return (
    <>
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Upcoming ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Past ({pastEvents.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          <EventGrid 
            events={upcomingEvents} 
            emptyMessage="You haven't RSVP'd to any upcoming events yet. Explore events to find something interesting!"
          />
        </TabsContent>
        
        <TabsContent value="past" className="mt-6">
          <EventGrid 
            events={pastEvents} 
            emptyMessage="No past events to show. Start attending events to build your history!"
          />
        </TabsContent>
      </Tabs>

      <EventModal 
        event={selectedEvent} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        onAuthPrompt={handleAuthPrompt}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab="signup"
      />
    </>
  )
} 