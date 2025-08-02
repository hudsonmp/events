"use client"

import { useEffect, useState } from "react"
import type { Event } from "@/lib/types"
import { Calendar, MapPin, ExternalLink, X, Clock, Users, UserCheck } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

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
  const [isAttending, setIsAttending] = useState(false)
  const [attendeeCount, setAttendeeCount] = useState(0)
  const [loading, setLoading] = useState(false)
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

      setAttendeeCount(count || 0)

      // Check if current user is attending
      if (user) {
        const { data } = await supabase
          .from("event_attendees")
          .select("*")
          .eq("event_id", event.id)
          .eq("user_id", user.id)
          .single()

        setIsAttending(!!data)
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

    setLoading(true)

    try {
      if (isAttending) {
        // Remove RSVP
        const { error } = await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", user.id)

        if (error) throw error

        setIsAttending(false)
        setAttendeeCount(prev => Math.max(0, prev - 1))
        toast.success("RSVP cancelled")
      } else {
        // Add RSVP
        const { error } = await supabase
          .from("event_attendees")
          .insert({
            event_id: event.id,
            user_id: user.id,
          })

        if (error) throw error

        setIsAttending(true)
        setAttendeeCount(prev => prev + 1)
        toast.success("RSVP confirmed!")
      }
    } catch (error) {
      toast.error("Failed to update RSVP. Please try again.")
      console.error("RSVP error:", error)
    } finally {
      setLoading(false)
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        <div className="overflow-y-auto max-h-[90vh]">
          {/* Image Gallery */}
          {allImages.length > 0 && (
            <div className="relative h-64 md:h-80">
              {allImages.length === 1 ? (
                <Image
                  src={getStorageUrl("instagram-posts", allImages[0].file_path) || "/placeholder.svg"}
                  alt={event.name || "Event image"}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=320&width=640&text=Image+Not+Found"
                  }}
                />
              ) : (
                <div className="flex h-full overflow-x-auto gap-1">
                  {allImages.map((img, index) => (
                    <div key={index} className="relative flex-shrink-0 w-64 h-full">
                      <Image
                        src={getStorageUrl("instagram-posts", img.file_path) || "/placeholder.svg"}
                        alt={`${event.name} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=320&width=256&text=Image+Not+Found"
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 text-white px-2 py-1 rounded-full text-sm">
                  {allImages.length} photos
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{event.name || "Untitled Event"}</h1>
                {attendeeCount > 0 && (
                  <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    <Users className="w-4 h-4" />
                    <span className="text-sm font-medium">{attendeeCount} attending</span>
                  </div>
                )}
              </div>

              {/* Date and Time */}
              {event.start_datetime && (
                <div className="flex items-center gap-3 text-slate-600">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-medium">{formatDate(event.start_datetime)}</div>
                    {!event.is_all_day && (
                      <div className="text-sm flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(event.start_datetime)}
                        {event.end_datetime && ` - ${formatTime(event.end_datetime)}`}
                      </div>
                    )}
                    {event.is_all_day && <div className="text-sm text-slate-500">All day event</div>}
                  </div>
                </div>
              )}

              {/* Location */}
              {event.location_name && (
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  <div>
                    <div className="font-medium">{event.location_name}</div>
                    {event.address && <div className="text-sm text-slate-500">{event.address}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* RSVP Section */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Interested in attending?</h3>
                  <p className="text-sm text-slate-600">
                    {user 
                      ? (isAttending ? "You're attending this event" : "Let organizers know you're coming")
                      : "Sign in to RSVP and get updates"
                    }
                  </p>
                </div>
                <Button
                  onClick={user ? handleRSVP : onAuthPrompt}
                  disabled={loading}
                  className={`min-w-[120px] ${
                    isAttending 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {loading ? (
                    "..."
                  ) : user ? (
                    isAttending ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-2" />
                        Attending
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 mr-2" />
                        RSVP
                      </>
                    )
                  ) : (
                    "Sign In to RSVP"
                  )}
                </Button>
              </div>
            </div>

            {/* Categories and Type */}
            <div className="flex gap-2 flex-wrap">
              {event.categories
                ?.filter(({ category }) => category?.name)
                .map(({ category }) => (
                  <span
                    key={category.name}
                    className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-full capitalize"
                  >
                    {category.name}
                  </span>
                )) || []}
              <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-full capitalize">
                {event.type}
              </span>
            </div>

            {/* Description */}
            {event.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-800">About this event</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-800">Tags</h3>
                <div className="flex gap-2 flex-wrap">
                  {event.tags.map(({ tag }, index) => (
                    <span key={index} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer */}
            {event.profile && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-800">Organized by</h3>
                <div className="flex items-center gap-3">
                  <Image
                    src={getProfilePicUrl(event.profile.username) || "/placeholder.svg"}
                    alt={event.profile.username}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=40&width=40&text=Profile"
                    }}
                  />
                  <div>
                    <div className="font-medium text-slate-800">@{event.profile.username}</div>
                    {event.profile.bio && (
                      <div className="text-sm text-slate-500 line-clamp-2">{event.profile.bio}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* School */}
            {event.school && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-800">School</h3>
                <div className="text-slate-600">
                  <div className="font-medium">{event.school.name}</div>
                  {event.school.address && <div className="text-sm text-slate-500">{event.school.address}</div>}
                </div>
              </div>
            )}

            {/* Action Button */}
            {event.url && (
              <div className="pt-4 border-t">
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-green-800 to-yellow-600 hover:from-green-900 hover:to-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Learn More
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
