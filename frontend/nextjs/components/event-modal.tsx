"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Calendar, Clock, MapPin, X, Users, User, UserCheck } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useAuth } from "@/lib/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { rsvpToEvent, cancelRsvp, checkRsvpStatus } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Event } from "@/lib/types"
import { motion, AnimatePresence } from "framer-motion"
import { modalVariants, overlayVariants, SlideUp, FadeIn } from "@/lib/motion"

interface EventModalProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
  onAuthPrompt?: () => void
}

const getStorageUrl = (bucket: string, path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL}/storage/v1/object/public/${bucket}/${path}`

export function EventModal({ event, isOpen, onClose, onAuthPrompt }: EventModalProps) {
  const { user } = useAuth()
  const [isRSVPd, setIsRSVPd] = useState(false)
  const [rsvpCount, setRsvpCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  // Check if user is attending and get attendee count
  useEffect(() => {
    if (!event || !isOpen) return

    const checkAttendance = async () => {
      // Get attendee count
      const { count } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)

      setRsvpCount(count || 0)

      // Check if current user is attending
      if (user) {
        const { data } = await supabase
          .from("event_attendees")
          .select("*")
          .eq("event_id", event.id)
          .eq("user_id", user.id)
          .single()

        setIsRSVPd(!!data)
      }
    }

    checkAttendance()
  }, [event, isOpen, user, supabase])

  const handleRSVP = async () => {
    if (!user) {
      onAuthPrompt?.()
      return
    }

    if (!event) return

    setIsLoading(true)

          try {
        if (isRSVPd) {
          // Remove RSVP
          const { error } = await cancelRsvp(event.id, user.id)

          if (error) throw error

          setIsRSVPd(false)
          setRsvpCount(prev => Math.max(0, prev - 1))
          toast.success("RSVP cancelled")
        } else {
          // Add RSVP
          const { error } = await rsvpToEvent(event.id, user.id)

          if (error) throw error

          setIsRSVPd(true)
          setRsvpCount(prev => prev + 1)
          toast.success("RSVP confirmed!")
        }
    } catch (error) {
      toast.error("Failed to update RSVP. Please try again.")
      console.error("RSVP error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Date TBD"
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
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

  // Get post images from the instagram-posts bucket
  const allImages = event.post_images?.post_images || []

  // Get profile picture from instagram-profile-pics bucket
  const getProfilePicUrl = (username: string) => {
    // Profile pics are stored as: username/username_profile.jpg
    return getStorageUrl("instagram-profile-pics", `${username}/${username}_profile.jpg`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <DialogContent className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] border-0 bg-transparent p-0 shadow-none">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalVariants}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm hover:bg-white text-slate-600 hover:text-slate-800 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all"
              >
                <X className="h-5 w-5" />
              </motion.button>

              {/* Event Image */}
              <div className="relative h-64 md:h-80 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden rounded-t-2xl">
                {/* Primary image source */}
                {event.event_images && event.event_images.length > 0 ? (
                  <Image
                    src={getStorageUrl("event-images", event.event_images[0].image.storage_path)}
                    alt={event.name}
                    fill
                    className="object-cover"
                    priority
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=320&width=600"
                    }}
                  />
                ) : event.post_images?.post_images && event.post_images.post_images.length > 0 ? (
                  <Image
                    src={getStorageUrl("post-images", event.post_images.post_images[0].file_path)}
                    alt={event.name}
                    fill
                    className="object-cover"
                    priority
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=320&width=600"
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="h-24 w-24 text-slate-400" />
                  </div>
                )}
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Category badge */}
                {event.categories && event.categories.length > 0 && (
                  <motion.div 
                    className="absolute top-6 left-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Badge className="bg-white/90 text-slate-800 backdrop-blur-sm text-sm">
                      {event.categories[0].category.name}
                    </Badge>
                  </motion.div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 md:p-8">
                <SlideUp delay={0.1}>
                  {/* Title and RSVP Button */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div className="flex-1">
                      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 leading-tight">
                        {event.name}
                      </h1>
                      
                      {/* Event metadata */}
                      <div className="space-y-3">
                        {event.start_datetime && (
                          <motion.div 
                            className="flex items-center text-slate-600"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Clock className="h-5 w-5 mr-3 text-slate-400" />
                            <div>
                              <div className="font-medium">{formatDate(event.start_datetime)}</div>
                              {formatTime(event.start_datetime) && (
                                <div className="text-sm text-slate-500">
                                  {formatTime(event.start_datetime)}
                                  {event.end_datetime && formatTime(event.end_datetime) && (
                                    <span> - {formatTime(event.end_datetime)}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {event.location_name && (
                          <motion.div 
                            className="flex items-center text-slate-600"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 }}
                          >
                            <MapPin className="h-5 w-5 mr-3 text-slate-400" />
                            <span>{event.location_name}</span>
                          </motion.div>
                        )}

                        {event.profile && (
                          <motion.div 
                            className="flex items-center text-slate-600"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <User className="h-5 w-5 mr-3 text-slate-400" />
                            <div className="flex items-center gap-2">
                              <div className="relative h-6 w-6 rounded-full overflow-hidden bg-slate-200">
                                <Image
                                  src={getProfilePicUrl(event.profile.username)}
                                  alt={event.profile.username}
                                  fill
                                  className="object-cover"
                                  sizes="24px"
                                />
                              </div>
                              <span>Organized by {event.profile.username}</span>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* RSVP Button */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        onClick={handleRSVP}
                        disabled={isLoading}
                        size="lg"
                        className={`min-w-[140px] transition-all duration-200 ${
                          isRSVPd
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {isLoading ? (
                            <motion.div
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                              />
                              Loading...
                            </motion.div>
                          ) : (
                            <motion.div
                              key="content"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              {isRSVPd ? <UserCheck className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                              {isRSVPd ? "Going" : "RSVP"} ({rsvpCount})
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </motion.div>
                  </div>
                </SlideUp>

                {/* Description */}
                {event.description && (
                  <FadeIn delay={0.4}>
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold text-slate-800 mb-3">About this event</h2>
                      <div className="prose prose-slate max-w-none">
                        <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </FadeIn>
                )}

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <FadeIn delay={0.5}>
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-slate-800 mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {event.tags.map((tag, index) => (
                          <motion.div
                            key={tag.tag}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.05 }}
                          >
                            <Badge variant="outline" className="text-sm">
                              {tag.tag}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </FadeIn>
                )}

                {/* Additional Images */}
                {event.event_images && event.event_images.length > 1 && (
                  <FadeIn delay={0.6}>
                    <div>
                      <h3 className="text-sm font-medium text-slate-800 mb-3">Gallery</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {event.event_images.slice(1).map((img, index) => (
                          <motion.div
                            key={img.image.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden cursor-pointer"
                          >
                            <Image
                              src={getStorageUrl("event-images", img.image.storage_path)}
                              alt={`${event.name} - Image ${index + 2}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 33vw"
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </FadeIn>
                )}
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
