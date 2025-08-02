import { createServerClient } from "@/lib/supabase/server"
import { EventList } from "@/components/event-list"
import { CompactCalendar } from "@/components/compact-calendar"
import type { Event } from "@/lib/types"

export const revalidate = 60 // Revalidate every 60 seconds

async function getInitialEvents(): Promise<Event[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from("events")
    .select(
      `
    *,
    categories:event_categories(category:categories(id, name)),
    tags:event_tags(tag),
    profile:profiles(username, profile_pic_url, bio),
    school:schools(name, address),
    post_images:posts!post_id(
      post_images(file_path)
    ),
    event_images:event_images(
      image:images(id, storage_path, url)
    )
  `,
    )
    .eq("status", "active")
    .or(`start_datetime.gte.${new Date().toISOString()},start_datetime.is.null`)
    .limit(20)

  if (error) {
    console.error("Error fetching initial events:", error)
    return []
  }
  
  // Sort events: events with dates first (sorted by date), then events without dates
  const sortedData = (data || []).sort((a, b) => {
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
    .select(
      `
    *,
    categories:event_categories(category:categories(id, name)),
    tags:event_tags(tag),
    profile:profiles(username, profile_pic_url, bio),
    school:schools(name, address),
    event_images:event_images(
      image:images(id, storage_path, url)
    )
  `,
    )
    .eq("status", "active")
    .or(`start_datetime.gte.${new Date().toISOString()},start_datetime.is.null`)

  if (error) {
    console.error("Error fetching calendar events:", error)
    return []
  }
  
  // Sort events: events with dates first (sorted by date), then events without dates
  const sortedData = (data || []).sort((a, b) => {
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

export default async function HomePage() {
  const initialEvents = await getInitialEvents()
  const calendarEvents = await getCalendarEvents()

  return (
    <section className="w-full">
      {/* Mobile: Full width events feed only */}
      <div className="lg:hidden">
        <EventList initialEvents={initialEvents} />
      </div>
      
      {/* Desktop: Side-by-side layout */}
      <div className="hidden lg:flex gap-6 max-w-screen-2xl mx-auto p-4">
        {/* Events Feed - 2/3 width */}
        <div className="flex-1 w-2/3">
          <EventList initialEvents={initialEvents} />
        </div>
        
        {/* Calendar Sidebar - 1/3 width */}
        <div className="w-1/3 min-w-[320px]">
          <div className="sticky top-4">
            <CompactCalendar events={calendarEvents} />
          </div>
        </div>
      </div>
    </section>
  )
}
