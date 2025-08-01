"use client"

import type { Event } from "@/lib/types"
import { Calendar, MapPin, UserCheck, Loader2 } from "lucide-react"
import Image from "next/image"
import { useAuth } from "@/lib/contexts/auth-context"
import { useState, useEffect } from "react"
import { AuthModal } from "@/components/auth-modal"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { rsvpToEvent, cancelRsvp, checkRsvpStatus } from "@/lib/supabase/client"

interface EventCardProps {
  event: Event
  onClick?: () => void
}

const getStorageUrl = (bucket: string, path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL}/storage/v1/object/public/${bucket}/${path}`

export function EventCard({ event, onClick }: EventCardProps) {
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isRSVPed, setIsRSVPed] = useState(false)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [checkingRsvp, setCheckingRsvp] = useState(false)
  
  const firstImage = event.post_images?.post_images?.[0]?.file_path
  const imageUrl = firstImage ? getStorageUrl("instagram-posts", firstImage) : null

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
        }
      }
    } catch (error) {
      toast.error("Something went wrong")
      console.error("RSVP action error:", error instanceof Error ? error.message : error)
    } finally {
      setRsvpLoading(false)
    }
  }

  return (
    <>
      <div
        className="bg-slate-50 rounded-xl shadow-sm border p-4 flex flex-col space-y-3 transition-all hover:shadow-md cursor-pointer hover:scale-[1.02]"
        onClick={onClick}
      >
        {imageUrl && (
          <div className="relative w-full h-40">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt={event.name || "Untitled Event"}
              fill={true}
              className="object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=160&width=320&text=Image+Not+Found"
              }}
            />
          </div>
        )}
        <div className="flex-grow space-y-2 flex flex-col">
          <h3 className="font-semibold text-slate-800 line-clamp-2">{event.name || "Untitled Event"}</h3>

          <div className="space-y-1 text-sm text-slate-600">
            {event.start_datetime && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  {formatDate(event.start_datetime)}
                  {!event.is_all_day && ` at ${formatTime(event.start_datetime)}`}
                </span>
              </div>
            )}
            {event.location_name && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{event.location_name}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-500 line-clamp-3 flex-grow">
            {event.description || "No description available"}
          </p>

          <div className="flex gap-2 flex-wrap pt-2">
            {event.categories
              ?.filter(({ category }) => category?.name)
              .map(({ category }) => (
                <span
                  key={category.name}
                  className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full capitalize"
                >
                  {category.name}
                </span>
              )) || []}
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full capitalize">
              {event.type}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t mt-auto">
            {event.profile && (
              <div className="flex items-center gap-2">
                <Image
                  src={getProfilePicUrl(event.profile.username) || "/placeholder.svg"}
                  alt={event.profile.username}
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = "/placeholder.svg?height=24&width=24&text=Profile"
                  }}
                />
                <span className="text-xs text-slate-500">@{event.profile.username}</span>
              </div>
            )}
            <Button
              onClick={handleRSVP}
              variant={isRSVPed ? "outline" : "default"}
              size="sm"
              disabled={rsvpLoading || checkingRsvp}
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                isRSVPed 
                  ? "border-emerald-600 text-emerald-600 hover:bg-emerald-50" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {rsvpLoading || checkingRsvp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              {checkingRsvp ? "Loading..." : isRSVPed ? "RSVP'd" : "RSVP"}
            </Button>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultTab="signup"
      />
    </>
  )
}
