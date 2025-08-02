import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { UserEventsClient } from "@/components/user-events-client"
import type { Event } from "@/lib/types"

export const revalidate = 60 // Revalidate every 60 seconds

async function getUserEvents(userId: string): Promise<{ upcoming: Event[], past: Event[] }> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()

  // Get all events the user is attending
  const { data: attendeeData, error: attendeeError } = await supabase
    .from("event_attendees")
    .select(`
      event_id,
      events!inner(
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
      )
    `)
    .eq("user_id", userId)
    .eq("events.status", "active")

  if (attendeeError) {
    console.error("Error fetching user events:", attendeeError)
    return { upcoming: [], past: [] }
  }

  const allEvents: Event[] = attendeeData?.map((item: any) => item.events).filter(Boolean) || []

  // Separate upcoming and past events
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

  return { upcoming, past }
}

export default async function MyEventsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  const { upcoming, past } = await getUserEvents(user.id)

  return (
    <section className="w-full">
      <div className="container max-w-screen-2xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">My Events</h1>
          <p className="text-slate-600">Events you've RSVP'd to</p>
        </div>
        <UserEventsClient initialUpcoming={upcoming} initialPast={past} />
      </div>
    </section>
  )
} 