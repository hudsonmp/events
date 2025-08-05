"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { CompactCalendar } from "@/components/compact-calendar"
import { TrendingEvents } from "@/components/trending-events"
import { CategoriesSection } from "@/components/categories-section"
import { PopularTags } from "@/components/popular-tags"
import { MyEventsHorizontal } from "@/components/my-events-horizontal"
import type { Event } from "@/lib/types"

export default function HomePage() {
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([])
  const [calendarEvents, setCalendarEvents] = useState<Event[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch trending events
        const { data: trendingData, error: trendingError } = await supabase
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

        if (trendingData && !trendingError) {
          // Sort by attendee count (most RSVPs first)
          const sortedData = trendingData.sort((a, b) => {
            const aCount = a.attendees?.length || 0
            const bCount = b.attendees?.length || 0
            return bCount - aCount
          })
          setTrendingEvents(sortedData)
        }

        // Fetch calendar events
        const { data: calendarData, error: calendarError } = await supabase
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
          .order("start_datetime", { ascending: true })
          .limit(100)

        if (calendarData && !calendarError) {
          // Return all events including past ones for calendar display
          setCalendarEvents(calendarData.filter(event => event.start_datetime))
        }
      } catch (error) {
        console.error("Error fetching events:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [supabase])

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    if (selectedCategoryId === categoryId) {
      // If clicking the same category, clear the filter
      setSelectedCategoryId(null)
      setSelectedCategoryName(null)
    } else {
      // Set new category filter and clear tag filter
      setSelectedCategoryId(categoryId)
      setSelectedCategoryName(categoryName)
      setSelectedTag(null) // Clear tag when selecting category
    }
  }

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      // If clicking the same tag, clear the filter
      setSelectedTag(null)
    } else {
      // Set new tag filter and clear category filter
      setSelectedTag(tag)
      setSelectedCategoryId(null) // Clear category when selecting tag
      setSelectedCategoryName(null)
    }
  }

  const handleClearFilter = () => {
    setSelectedCategoryId(null)
    setSelectedCategoryName(null)
    setSelectedTag(null)
  }

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
          <TrendingEvents 
            initialEvents={trendingEvents} 
            selectedCategoryId={selectedCategoryId}
            selectedCategoryName={selectedCategoryName}
            selectedTag={selectedTag}
            onClearFilter={handleClearFilter}
          />
          
          {/* Compact Calendar */}
          <div className="px-4 py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
            <CompactCalendar events={calendarEvents} />
          </div>
          
          {/* Categories */}
          <CategoriesSection 
            onCategoryClick={handleCategoryClick}
            selectedCategoryId={selectedCategoryId}
          />
          
          {/* Popular Tags */}
          <PopularTags 
            onTagClick={handleTagClick}
            selectedTag={selectedTag}
          />
          
          {/* My Events */}
          <MyEventsHorizontal />
        </div>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex gap-6 max-w-screen-2xl mx-auto p-4">
        {/* Main Content - 2/3 width */}
        <div className="flex-1 max-w-none space-y-2">
          {/* Trending Events */}
          <TrendingEvents 
            initialEvents={trendingEvents} 
            selectedCategoryId={selectedCategoryId}
            selectedCategoryName={selectedCategoryName}
            selectedTag={selectedTag}
            onClearFilter={handleClearFilter}
          />
          
          {/* Categories */}
          <CategoriesSection 
            onCategoryClick={handleCategoryClick}
            selectedCategoryId={selectedCategoryId}
          />
          
          {/* Popular Tags */}
          <PopularTags 
            onTagClick={handleTagClick}
            selectedTag={selectedTag}
          />
          
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
