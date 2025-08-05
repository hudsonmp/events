import { createServerClient } from "@/lib/supabase/server"
import { EventList } from "@/components/event-list"
import { CompactCalendar } from "@/components/compact-calendar"
import type { Event } from "@/lib/types"

export const revalidate = 60 // Revalidate every 60 seconds

async function getInitialEvents(): Promise<Event[]> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from("events")
    .select(`
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
    `)
    .eq("status", "active")
    .order('start_datetime', { ascending: true, nullsFirst: false })
    .limit(100)

  if (error) {
    console.error("Error fetching initial events:", error)
    return []
  }
  
  // Filter out past events (keep events without dates and future events)
  const currentAndFutureEvents = (data || []).filter(event => {
    // If event has no start_datetime, include it (might be ongoing or timeless events)
    if (!event.start_datetime) {
      return true
    }
    // Only include events that haven't started yet or are currently happening
    return new Date(event.start_datetime) >= new Date(now)
  })
  
  // Sort events: events with dates first (sorted by date), then events without dates
  const sortedData = currentAndFutureEvents.sort((a, b) => {
    // If both have dates, sort by date
    if (a.start_datetime && b.start_datetime) {
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    }
    // If only a has a date, a comes first
    if (a.start_datetime && !b.start_datetime) {
      return -1
    }
    // If only b has a date, b comes first
    if (!a.start_datetime && b.start_datetime) {
      return 1
    }
    // If neither has a date, maintain original order
    return 0
  })
  
  return sortedData
}

async function getCalendarEvents(): Promise<Event[]> {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from("events")
    .select(`
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
    `)
    .eq("status", "active")
    .order("start_datetime", { ascending: true })
    .limit(100)

  if (error) {
    console.error("Error fetching calendar events:", error)
    return []
  }
  
  // Return all events including past ones for calendar display
  // Sort by date with past events first (oldest to newest), then future events
  return (data || []).filter(event => event.start_datetime).sort((a, b) => {
    if (a.start_datetime && b.start_datetime) {
      return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    }
    return 0
  })
}

export default async function FindEventsPage() {
  const initialEvents = await getInitialEvents()
  const calendarEvents = await getCalendarEvents()

  return (
    <section className="w-full min-h-screen bg-white">
      {/* Page Header */}
      <div className="px-4 pt-6 pb-4 lg:px-6">
        <div className="max-w-screen-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Events</h1>
          <p className="text-gray-600">Discover upcoming events in San Diego</p>
        </div>
      </div>

      {/* Mobile: Full width events feed only */}
      <div className="lg:hidden">
        <EventList initialEvents={initialEvents} />
      </div>
      
      {/* Desktop: Side-by-side layout */}
      <div className="hidden lg:flex gap-6 max-w-screen-2xl mx-auto px-6 pb-6">
        {/* Events Feed - 2/3 width */}
        <div className="flex-1 max-w-none">
          <EventList initialEvents={initialEvents} />
        </div>
        
        {/* Calendar Sidebar - 1/3 width */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Calendar</h2>
            <CompactCalendar events={calendarEvents} />
          </div>
        </div>
      </div>
    </section>
  )
}