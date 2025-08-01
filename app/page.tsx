import { createServerClient } from "@/lib/supabase/server"
import { EventList } from "@/components/event-list"
import type { Event } from "@/lib/types"

export const revalidate = 60 // Revalidate every 60 seconds

async function getInitialEvents(): Promise<Event[]> {
  const supabase = createServerClient()
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
    .gte("start_datetime", new Date().toISOString())
    .order("start_datetime", { ascending: true, nullsLast: true })
    .limit(20)

  if (error) {
    console.error("Error fetching initial events:", error)
    return []
  }
  return data || []
}

export default async function HomePage() {
  const initialEvents = await getInitialEvents()

  return (
    <section className="w-full">
      <EventList initialEvents={initialEvents} />
    </section>
  )
}
