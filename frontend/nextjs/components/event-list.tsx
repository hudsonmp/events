"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { type Event, CATEGORIES } from "@/lib/types"
import { EventCard } from "./event-card"
import { EventModal } from "./event-modal"
import { AuthModal } from "./auth-modal"
import { Input } from "@/components/ui/input"
import { Search, Calendar, Clock } from "lucide-react"
import { useDebounce } from "use-debounce"
import { motion, AnimatePresence } from "framer-motion"
import { StaggerContainer, StaggerItem } from "@/lib/motion"

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
  const [showSearchHint, setShowSearchHint] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMoreEvents, setHasMoreEvents] = useState(true)

  // Hide search hint after 5 seconds or when user starts typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSearchHint(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (query.length > 0) {
      setShowSearchHint(false)
    }
  }, [query])

  const fetchEvents = useCallback(
    async (searchQuery: string, category: string | null) => {
      setIsLoading(true)
      let queryBuilder

      if (category) {
        // When filtering by category, use inner join to only get events with that category
        queryBuilder = supabase
          .from("events")
          .select(`
            *,
            categories:event_categories!inner(category:categories!inner(id, name)),
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
          .eq("event_categories.categories.name", category)
      } else {
        // When showing all events, use left join to include events without categories
        queryBuilder = supabase
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
      }

      queryBuilder = queryBuilder
        .eq("status", "active")

      if (searchQuery) {
        queryBuilder = queryBuilder.or(
          `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%`,
        )
      }

      queryBuilder = queryBuilder
        .order('created_at', { ascending: false })
        .limit(200)  // High limit to ensure we get all events

      const { data, error } = await queryBuilder

      if (error) {
        console.error("Error fetching events:", error)
        setEvents([])
      } else {
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
        setEvents(sortedData)
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
      <motion.div 
        className="container max-w-screen-2xl mx-auto p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Search Bar */}
        <motion.div 
          className="flex flex-col lg:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
          </div>
          
          {/* Category Filter Buttons */}
          <motion.div 
            className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 lg:pb-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleCategorySelect(null)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === null
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Events
            </motion.button>
            {CATEGORIES.map((category, index) => (
              <motion.button
                key={category}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                onClick={() => handleCategorySelect(category)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {category}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Events Grid */}
      <div className="container max-w-screen-2xl mx-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            <AnimatePresence>
              {events
                .map((event, index) => (
                  <StaggerItem
                    key={event.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ 
                      delay: index * 0.05,
                      type: "spring",
                      damping: 20,
                      stiffness: 300
                    }}
                  >
                    <EventCard
                      event={event}
                      onClick={() => handleEventClick(event)}
                    />
                  </StaggerItem>
                ))}
            </AnimatePresence>
          </StaggerContainer>
        ) : (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No events found</h3>
            <p className="text-slate-500">
              {query || activeCategory 
                ? "Try adjusting your search or filter criteria" 
                : "Check back later for new events"}
            </p>
          </motion.div>
        )}

        {/* Load More Button */}
        {hasMoreEvents && events.length > 0 && (
          <motion.div 
            className="flex justify-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Assuming Button and Loader2 are imported or defined elsewhere */}
              {/* <Button
                onClick={loadMoreEvents}
                disabled={isLoading}
                variant="outline"
                className="bg-white hover:bg-slate-50 border-slate-200"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4 mr-2" />
                  </motion.div>
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Loading..." : "Load More Events"}
              </Button> */}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedEvent && (
          <EventModal
            event={selectedEvent}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onAuthPrompt={handleAuthPrompt}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authModalOpen && (
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            defaultTab="signup"
          />
        )}
      </AnimatePresence>
    </div>
  )
}
