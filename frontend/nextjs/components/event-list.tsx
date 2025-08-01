"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { type Event, CATEGORIES } from "@/lib/types"
import { EventCard } from "./event-card"
import { EventModal } from "./event-modal"
import { AuthModal } from "./auth-modal"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useDebounce } from "use-debounce"

export function EventList({ initialEvents }: { initialEvents: Event[] }) {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [isLoading, setIsLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [debouncedQuery] = useDebounce(query, 300)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const fetchEvents = useCallback(
    async (searchQuery: string, category: string | null) => {
      setIsLoading(true)
      let queryBuilder = supabase
        .from("events")
        .select(`
        *,
        categories:event_categories(category:categories(id, name)),
        tags:event_tags(tag),
        profile:profiles(username, profile_pic_url, bio),
        school:schools(name, address),
        post_images:posts!post_id(
          post_images(file_path)
        )
      `)
        .eq("status", "active")
        .gte("start_datetime", new Date().toISOString())

      if (category) {
        queryBuilder = queryBuilder.eq("categories.category.name", category)
      }

      if (searchQuery) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%`,
        )
      }

      const { data, error } = await queryBuilder.order("start_datetime", { ascending: true })

      if (error) {
        console.error("Error fetching events:", error)
        setEvents([])
      } else {
        setEvents(data || [])
      }
      setIsLoading(false)
    },
    [supabase],
  )

  useEffect(() => {
    fetchEvents(debouncedQuery, activeCategory)
  }, [debouncedQuery, activeCategory, fetchEvents])

  useEffect(() => {
    const channel = supabase
      .channel("events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, (payload) => {
        console.log("Change received!", payload)
        fetchEvents(debouncedQuery, activeCategory)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, debouncedQuery, activeCategory, fetchEvents])

  const handleCategorySelect = (category: string | null) => {
    setActiveCategory(category)
  }

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

  return (
    <div className="w-full">
      <div className="p-4 bg-slate-50/80 rounded-lg sticky top-[57px] z-40 backdrop-blur-sm">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            type="search"
            placeholder="Search for events, clubs, sports..."
            className="pl-10 w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Responsive Category Bar */}
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:overflow-visible md:flex-wrap">
            <button
              onClick={() => handleCategorySelect(null)}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeCategory === null ? "bg-primary-green text-white" : "bg-white hover:bg-slate-100 text-slate-700"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-colors capitalize flex-shrink-0 ${
                  activeCategory === category
                    ? "bg-primary-green text-white"
                    : "bg-white hover:bg-slate-100 text-slate-700"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Fade gradient for mobile to indicate scrollability */}
          <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-slate-50/80 to-transparent pointer-events-none md:hidden"></div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-4 h-96 animate-pulse">
                <div className="bg-slate-200 rounded-lg h-40 w-full mb-3"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-slate-700">No Events Found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

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
    </div>
  )
}
