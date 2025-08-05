"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { UserEventsClient } from "@/components/user-events-client"
import type { Event } from "@/lib/types"

async function getUserEvents(userId: string): Promise<{ upcoming: Event[], past: Event[] }> {
  const supabase = createClient()
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

export default function MyEventsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userEvents, setUserEvents] = useState<{ upcoming: Event[], past: Event[] }>({ upcoming: [], past: [] })
  const [isLoadingEvents, setIsLoadingEvents] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
      return
    }

    if (user) {
      getUserEvents(user.id).then((events) => {
        setUserEvents(events)
        setIsLoadingEvents(false)
      })
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading || !user) {
    return (
      <section className="w-full">
        <div className="container max-w-screen-2xl mx-auto p-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">My Events</h1>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="w-full">
      <div className="container max-w-screen-2xl mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">My Events</h1>
          <p className="text-slate-600">Events you've RSVP'd to</p>
        </div>
        {isLoadingEvents ? (
          <p className="text-slate-600">Loading your events...</p>
        ) : (
          <UserEventsClient initialUpcoming={userEvents.upcoming} initialPast={userEvents.past} />
        )}
      </div>
    </section>
  )
} 