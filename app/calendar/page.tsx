import { createServerClient } from "@/lib/supabase/server"
import { CalendarView } from "@/components/calendar-view"
import type { Event } from "@/lib/types"

export const revalidate = 60 // Revalidate every 60 seconds

async function getCalendarEvents(): Promise<Event[]> {
  const supabase = createServerClient()

  // Get events for the next 3 months
  const startDate = new Date()
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 3)

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
    )
  `,
    )
    .eq("status", "active")
    .gte("start_datetime", startDate.toISOString())
    .lte("start_datetime", endDate.toISOString())
    .order("start_datetime", { ascending: true })

  if (error) {
    console.error("Error fetching calendar events:", error)
    return []
  }
  return data || []
}

export default async function CalendarPage() {
  const events = await getCalendarEvents()

  return (
    <section className="w-full">
      <div className="container max-w-screen-2xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Event Calendar</h1>
          <p className="text-slate-600">View all upcoming events by date</p>
        </div>
        <CalendarView events={events} />
      </div>
    </section>
  )
}
