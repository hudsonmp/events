"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, MapPin, Clock, Users, X, Loader2, Save, ImagePlus } from "lucide-react"
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker"
import { LocationSearch } from "@/components/ui/location-search"
import { ImageUpload } from "@/components/image-upload"
import { useAuth } from "@/lib/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Event } from "@/lib/types"

interface EditEventModalProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
  onEventUpdated?: (updatedEvent: Event) => void
}

export function EditEventModal({ event, isOpen, onClose, onEventUpdated }: EditEventModalProps) {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    start_datetime: "",
    end_datetime: "",
    location_name: "",
    address: "",
    is_all_day: false,
    type: "in-person" as "in-person" | "virtual" | "hybrid"
  })
  const [images, setImages] = useState<string[]>([])
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when event changes
  useEffect(() => {
    if (event) {
      setFormData({
        start_datetime: event.start_datetime || "",
        end_datetime: event.end_datetime || "",
        location_name: event.location_name || "",
        address: event.address || "",
        is_all_day: event.is_all_day,
        type: event.type
      })
      setImages([])
    }
  }, [event])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowImageUpload(false)
      setImages([])
    }
  }, [isOpen])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!event || !user) return

    setIsSubmitting(true)

    try {
      // Update event via API
      const response = await fetch('/api/update-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          userId: user.id,
          updates: {
            start_datetime: formData.start_datetime || null,
            end_datetime: formData.end_datetime || null,
            location_name: formData.location_name || null,
            address: formData.address || null,
            is_all_day: formData.is_all_day,
            type: formData.type
          },
          images: images
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update event')
      }

      const { event: updatedEvent } = await response.json()
      
      toast.success("Event updated successfully!")
      
      if (onEventUpdated) {
        onEventUpdated(updatedEvent)
      }
      
      onClose()
      
    } catch (error: any) {
      console.error("Error updating event:", error)
      toast.error(error.message || "Failed to update event")
    } finally {
      setIsSubmitting(false)
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

  if (!event || !canEdit(event)) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Save className="h-5 w-5 text-blue-600" />
            Edit Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Event Title (Read-only) */}
          <div className="space-y-2">
            <Label className="text-gray-700 text-sm font-medium">Event Title (cannot be changed)</Label>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-600">
              {event.name}
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <Label className="text-gray-700 text-sm font-medium">Start Date & Time</Label>
            </div>
            <CustomDateTimePicker
              value={formData.start_datetime}
              onChange={(date) => handleInputChange("start_datetime", date)}
              className="bg-white border border-gray-200 text-gray-900 h-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            <div className="flex items-center space-x-3 mb-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <Label className="text-gray-700 text-sm font-medium">End Date & Time</Label>
            </div>
            <CustomDateTimePicker
              value={formData.end_datetime}
              onChange={(date) => handleInputChange("end_datetime", date)}
              className="bg-white border border-gray-200 text-gray-900 h-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* All Day Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700 font-medium">All day event</span>
              </div>
              <Switch
                checked={formData.is_all_day}
                onCheckedChange={(checked) => handleInputChange("is_all_day", checked)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-600" />
              <Label className="text-gray-700 text-sm font-medium">Event Type</Label>
            </div>
            <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
              <SelectTrigger className="bg-white border border-gray-200 text-gray-900 h-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-xl rounded-xl">
                <SelectItem value="in-person" className="text-gray-800 hover:bg-gray-50">In Person</SelectItem>
                <SelectItem value="virtual" className="text-gray-800 hover:bg-gray-50">Virtual</SelectItem>
                <SelectItem value="hybrid" className="text-gray-800 hover:bg-gray-50">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-gray-600" />
              <Label className="text-gray-700 text-sm font-medium">Location</Label>
            </div>
            <LocationSearch
              value={formData.location_name}
              onChange={(location) => handleInputChange("location_name", location)}
              onAddressChange={(address) => handleInputChange("address", address)}
              placeholder="Event Location"
              className="bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-12 rounded-xl"
            />
          </div>

          {/* Add Images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ImagePlus className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">Event Images</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImageUpload(true)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Add Images
              </Button>
            </div>
            
            {images.length > 0 && (
              <div className="text-sm text-gray-600">
                {images.length} image(s) ready to add
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Image Upload Modal */}
        {showImageUpload && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Add Event Images</h3>
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <ImageUpload
                onImagesChange={setImages}
                eventTitle={event.name}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}