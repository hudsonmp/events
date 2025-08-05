"use client"

import type { Event } from "@/lib/types"
import { Calendar, Clock, MapPin, Users, UserCheck, Loader2, Edit } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/lib/contexts/auth-context"
import { useState, useEffect } from "react"
import { AuthModal } from "@/components/auth-modal"
import { EditEventModal } from "@/components/edit-event-modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { createClient, rsvpToEvent, cancelRsvp, checkRsvpStatus, getRsvpCount } from "@/lib/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { cardHoverVariants, buttonTapVariants, SlideUp } from "@/lib/motion"

interface EventCardProps {
  event: Event
  onClick?: () => void
}

const getStorageUrl = (bucket: string, path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL}/storage/v1/object/public/${bucket}/${path}`

export function EventCard({ event, onClick }: EventCardProps) {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isRSVPed, setIsRSVPed] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [checkingRsvp, setCheckingRsvp] = useState(false)
  const [rsvpCount, setRsvpCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  
  // Try to get image from event_images first, then fall back to post
  const eventImage = event.event_images?.[0]?.image?.storage_path
  const postImage = event.post?.post_images?.[0]?.file_path
  
  const imageUrl = eventImage 
    ? getStorageUrl("event-images", eventImage)
    : postImage 
    ? getStorageUrl("instagram-posts", postImage)
    : null

  // Check RSVP status when user is loaded
  useEffect(() => {
    if (user && event.id) {
      setCheckingRsvp(true)
      checkRsvpStatus(event.id, user.id)
        .then(({ isRsvpd }) => {
          setIsRSVPed(isRsvpd)
        })
        .catch((error) => {
          console.error("Error checking RSVP status:", error.message || error)
        })
        .finally(() => {
          setCheckingRsvp(false)
        })
    } else {
      setIsRSVPed(false)
    }
  }, [user, event.id])

  // Fetch RSVP count when component mounts
  useEffect(() => {
    if (event.id) {
      getRsvpCount(event.id)
        .then(({ count, error }) => {
          if (error) {
            console.error("Error fetching RSVP count:", error.message || error)
          } else {
            setRsvpCount(count)
          }
        })
    }
  }, [event.id])

  // Get profile picture from instagram-profile-pics bucket
  const getProfilePicUrl = (username: string) => {
    // Profile pics are stored as: username/username_profile.jpg
    return getStorageUrl("instagram-profile-pics", `${username}/${username}_profile.jpg`)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Date TBD"
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const handleRSVP = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent modal from opening when clicking RSVP
    
    if (!user) {
      setShowAuthModal(true)
      return
    }

    if (!event.id) {
      toast.error("Event ID not found")
      return
    }

    setRsvpLoading(true)

    try {
      if (isRSVPed) {
        // Cancel RSVP
        const { error } = await cancelRsvp(event.id, user.id)
        if (error) {
          toast.error("Failed to cancel RSVP")
          console.error("Cancel RSVP error:", error.message || error)
        } else {
          setIsRSVPed(false)
          toast.success("RSVP cancelled successfully!")
          // Refresh RSVP count
          getRsvpCount(event.id).then(({ count }) => {
            setRsvpCount(count)
          })
        }
      } else {
        // Add RSVP
        const { error } = await rsvpToEvent(event.id, user.id)
        if (error) {
          toast.error("Failed to RSVP")
          console.error("RSVP error:", error.message || error)
        } else {
          setIsRSVPed(true)
          toast.success("RSVP confirmed!")
          // Refresh RSVP count
          getRsvpCount(event.id).then(({ count }) => {
            setRsvpCount(count)
          })
        }
      }
    } catch (error) {
      toast.error("Something went wrong")
      console.error("RSVP action error:", error instanceof Error ? error.message : error)
    } finally {
      setRsvpLoading(false)
    }
  }

  const canEdit = (event: Event): boolean => {
    if (!user) return false
    
    // User can edit their own events
    if (event.profile_id === user.id) return true
    
    // User can edit Instagram-imported events (those with post_id)
    if (event.post_id) return true
    
    return false
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setShowEditModal(true)
  }

  const handleEventUpdated = (updatedEvent: Event) => {
    // You could emit an event or refresh the parent component here
    // For now, we'll just close the modal and let the parent handle refresh if needed
    toast.success("Event updated successfully!")
  }

  return (
    <motion.div
      variants={cardHoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      layout
      className="h-full"
    >
      <Card 
        className="h-full cursor-pointer overflow-hidden bg-white border-slate-200 hover:shadow-lg transition-shadow duration-200"
        onClick={onClick}
      >
        <div className="relative">
          {/* Image */}
          <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
            {event.event_images && event.event_images.length > 0 ? (
              <Image
                src={getStorageUrl("event-images", event.event_images[0].image.storage_path)}
                alt={event.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"><svg class="h-16 w-16 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg></div>'
                  }
                }}
              />
            ) : event.post?.post_images && event.post.post_images.length > 0 ? (
              <Image
                src={getStorageUrl("instagram-posts", event.post.post_images[0].file_path)}
                alt={event.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"><svg class="h-16 w-16 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg></div>'
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Calendar className="h-16 w-16 text-slate-400" />
              </div>
            )}
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            
            {/* Category badges */}
            {event.categories && event.categories.length > 0 && event.categories[0].category && (
              <motion.div 
                className="absolute top-3 left-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="bg-white/90 text-slate-800 backdrop-blur-sm">
                  {event.categories[0].category.name}
                </Badge>
              </motion.div>
            )}

            {/* Edit Button */}
            {canEdit(event) && (
              <motion.div 
                className="absolute top-3 right-3"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white text-slate-600 hover:text-slate-800 backdrop-blur-sm shadow-md"
                    onClick={handleEdit}
                    title="Edit event"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
            
            {/* RSVP Button */}
            <motion.div 
              className="absolute bottom-3 right-3"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                variants={buttonTapVariants}
                initial="rest"
                whileTap="tap"
              >
                <Button
                  size="sm"
                  variant={isRSVPed ? "default" : "secondary"}
                  className={`backdrop-blur-sm transition-all duration-200 ${
                    isRSVPed 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-white/90 hover:bg-white text-slate-800"
                  }`}
                  onClick={handleRSVP}
                  disabled={isLoading}
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 border border-current border-t-transparent rounded-full"
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1"
                      >
                        <Users className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {isRSVPed ? "Going" : "RSVP"} ({rsvpCount})
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <CardContent className="p-4">
            <SlideUp delay={0.1}>
              <div className="space-y-3">
                {/* Title */}
                <h3 className="font-semibold text-lg text-slate-800 line-clamp-2 leading-tight">
                  {event.name}
                </h3>

                {/* Date and Time */}
                {event.start_datetime && (
                  <motion.div 
                    className="flex items-center text-sm text-slate-600"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Clock className="h-4 w-4 mr-2 text-slate-400" />
                    <span>{formatDate(event.start_datetime)}</span>
                    {formatTime(event.start_datetime) && (
                      <span className="ml-1">at {formatTime(event.start_datetime)}</span>
                    )}
                  </motion.div>
                )}

                {/* Location */}
                {event.location_name && (
                  <motion.div 
                    className="flex items-center text-sm text-slate-600"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <MapPin className="h-4 w-4 mr-2 text-slate-400" />
                    <span className="line-clamp-1">{event.location_name}</span>
                  </motion.div>
                )}

                {/* Description */}
                {event.description && (
                  <motion.p 
                    className="text-sm text-slate-600 line-clamp-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    {event.description}
                  </motion.p>
                )}

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <motion.div 
                    className="flex flex-wrap gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {event.tags.slice(0, 3).map((tag, index) => (
                      <motion.div
                        key={`${event.id}-tag-${index}-${tag.tag}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        <Badge variant="outline" className="text-xs">
                          {tag.tag}
                        </Badge>
                      </motion.div>
                    ))}
                    {event.tags.length > 3 && (
                      <motion.div
                        key={`${event.id}-more-tags`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.45 }}
                      >
                        <Badge variant="outline" className="text-xs">
                          +{event.tags.length - 3}
                        </Badge>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Profile */}
                {event.profile && (
                  <motion.div 
                    className="flex items-center gap-2 pt-2 border-t border-slate-100"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <div className="relative h-6 w-6 rounded-full overflow-hidden bg-slate-200">
                      <Image
                        src={getProfilePicUrl(event.profile.username)}
                        alt={event.profile.username}
                        fill
                        className="object-cover"
                        sizes="24px"
                      />
                    </div>
                    <div className="flex-1 text-xs text-slate-500">
                      <span>by {event.profile.username}</span>
                      {event.modified_by && (
                        <div className="text-xs text-blue-600 mt-0.5">
                          Modified by user
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </SlideUp>
          </CardContent>
        </div>
      </Card>

      {/* Edit Event Modal */}
      <EditEventModal
        event={event}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onEventUpdated={handleEventUpdated}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signin"
      />
    </motion.div>
  )
}
