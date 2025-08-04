import { createServerClient } from "@/lib/supabase/server"
import { CompactCalendar } from "@/components/compact-calendar"
import { TrendingEvents } from "@/components/trending-events"
import { CategoriesSection } from "@/components/categories-section"
import { PopularTags } from "@/components/popular-tags"
import { MyEventsHorizontal } from "@/components/my-events-horizontal"
import type { Event } from "@/lib/types"

export const revalidate = 60 // Revalidate every 60 seconds

async function getTrendingEvents(): Promise<Event[]> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()
  
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
    .gte("start_datetime", now)
    .limit(20)

  if (error) {
    console.error("Error fetching trending events:", error)
    return []
  }
  
  // Sort by attendee count (most RSVPs first)
  const sortedData = (data || []).sort((a, b) => {
    const aCount = a.attendees?.length || 0
    const bCount = b.attendees?.length || 0
    return bCount - aCount
  })
  
  return sortedData.slice(0, 6)
}

async function getCalendarEvents(): Promise<Event[]> {
  const supabase = await createServerClient()
  const now = new Date().toISOString()
  
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
      )
    `)
    .eq("status", "active")
    .gte("start_datetime", now)
    .order("start_datetime", { ascending: true })
    .limit(50)

  if (error) {
    console.error("Error fetching calendar events:", error)
    return []
  }
  
  return data || []
}

export default async function HomePage() {
  const trendingEvents = await getTrendingEvents()
  const calendarEvents = await getCalendarEvents()

  return (
    <section className="w-full min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
            <p className="text-gray-600 text-sm">San Diego</p>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="space-y-2">
          {/* Trending Events */}
          <TrendingEvents initialEvents={trendingEvents} />
          
          {/* Compact Calendar */}
          <div className="px-4 py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
            <CompactCalendar events={calendarEvents} />
          </div>
          
          {/* Categories */}
          <CategoriesSection />
          
          {/* Popular Tags */}
          <PopularTags />
          
          {/* My Events */}
          <MyEventsHorizontal />
        </div>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex gap-6 max-w-screen-2xl mx-auto p-4">
        {/* Main Content - 2/3 width */}
        <div className="flex-1 max-w-none space-y-2">
          {/* Trending Events */}
          <TrendingEvents initialEvents={trendingEvents} />
          
          {/* Categories */}
          <CategoriesSection />
          
          {/* Popular Tags */}
          <PopularTags />
          
          {/* My Events */}
          <MyEventsHorizontal />
        </div>
        
        {/* Calendar Sidebar - 1/3 width */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-20">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
            <CompactCalendar events={calendarEvents} />
          </div>
        </div>
      </div>
    </section>
  )
}
