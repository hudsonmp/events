"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/contexts/auth-context"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toast } from "sonner"
import { CalendarIcon, X, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { ImageUpload } from "@/components/image-upload"

const SCHOOL_ID = "00000000-0000-0000-0000-000000000001" // Patrick Henry High School

interface CategoryData {
  id: string
  name: string
}

interface ManualEventFormProps {
  onBack: () => void
  onSuccess: () => void
  initialData?: {
    title: string
    description: string
    tags: string[]
  }
}

export function ManualEventForm({ onBack, onSuccess, initialData }: ManualEventFormProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const isMobile = useIsMobile()
  
  // Form state
  const [formData, setFormData] = useState({
    name: initialData?.title || "",
    description: initialData?.description || "",
    location_name: "",
    address: "",
    url: "",
    start_datetime: "",
    end_datetime: "",
    is_all_day: false,
    type: "in-person" as "in-person" | "virtual" | "hybrid"
  })
  
  // Date and time state
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  
  // Categories and tags
  const [availableCategories, setAvailableCategories] = useState<CategoryData[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [newTag, setNewTag] = useState("")
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Images
  const [eventImages, setEventImages] = useState<string[]>([])

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name")
      
      if (!error && data) {
        setAvailableCategories(data)
      }
    }
    
    fetchCategories()
  }, [supabase])

  // Handle form changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Handle date/time changes
  const updateDateTime = () => {
    if (startDate && !formData.is_all_day && startTime) {
      const [hours, minutes] = startTime.split(':')
      const startDateTime = new Date(startDate)
      startDateTime.setHours(parseInt(hours), parseInt(minutes))
      setFormData(prev => ({ ...prev, start_datetime: startDateTime.toISOString() }))
    } else if (startDate && formData.is_all_day) {
      const startDateTime = new Date(startDate)
      startDateTime.setHours(0, 0, 0, 0)
      setFormData(prev => ({ ...prev, start_datetime: startDateTime.toISOString() }))
    }
    
    if (endDate && !formData.is_all_day && endTime) {
      const [hours, minutes] = endTime.split(':')
      const endDateTime = new Date(endDate)
      endDateTime.setHours(parseInt(hours), parseInt(minutes))
      setFormData(prev => ({ ...prev, end_datetime: endDateTime.toISOString() }))
    } else if (endDate && formData.is_all_day) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      setFormData(prev => ({ ...prev, end_datetime: endDateTime.toISOString() }))
    }
  }

  useEffect(() => {
    updateDateTime()
  }, [startDate, endDate, startTime, endTime, formData.is_all_day])

  // Handle tag addition
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag("")
    }
  }

  // Handle tag removal
  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  // Handle category toggle
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error("You must be logged in to create an event")
      return
    }

    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        throw new Error("Event name is required")
      }

      // Ensure user exists in the users table before creating event
      const { data: userData, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle()

      if (userCheckError) {
        console.error("Error checking user:", userCheckError)
        throw new Error("Failed to verify user account")
      }

      if (!userData) {
        // User doesn't exist, create them first
        const { error: userCreateError } = await supabase
          .from("users")
          .insert({
            id: user.id,
            school_id: SCHOOL_ID
          })

        if (userCreateError) {
          console.error("Error creating user:", userCreateError)
          throw new Error("Failed to create user account")
        }
      }

      // Create the event
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .insert({
          name: formData.name,
          description: formData.description,
          location_name: formData.location_name,
          address: formData.address,
          url: formData.url,
          start_datetime: formData.start_datetime || null,
          end_datetime: formData.end_datetime || null,
          is_all_day: formData.is_all_day,
          type: formData.type,
          school_id: SCHOOL_ID,
          status: "active"
        })
        .select()
        .single()

      if (eventError) throw eventError

      const eventId = eventData.id

      // Add user as host
      const { error: hostError } = await supabase
        .from("event_hosts")
        .insert({
          event_id: eventId,
          user_id: user.id
        })

      if (hostError) throw hostError

      // Add categories
      if (selectedCategories.length > 0) {
        const { error: categoryError } = await supabase
          .from("event_categories")
          .insert(
            selectedCategories.map(categoryId => ({
              event_id: eventId,
              category_id: categoryId
            }))
          )

        if (categoryError) throw categoryError
      }

      // Add tags
      if (tags.length > 0) {
        const { error: tagError } = await supabase
          .from("event_tags")
          .insert(
            tags.map(tag => ({
              event_id: eventId,
              tag: tag
            }))
          )

        if (tagError) throw tagError
      }

      // Add images
      if (eventImages.length > 0) {
        console.log("Adding images:", eventImages)
        
        // First, create image records
        const imageInserts = eventImages.map(imagePath => ({
          storage_path: imagePath,
          event_id: eventId
        }))
        console.log("Image insert data:", imageInserts)

        const { data: imageRecords, error: imageInsertError } = await supabase
          .from("images")
          .insert(imageInserts)
          .select()

        if (imageInsertError) {
          console.error("Image record creation error:", imageInsertError)
          throw new Error(`Failed to create image records: ${imageInsertError.message || JSON.stringify(imageInsertError)}`)
        } else if (imageRecords) {
          // Then, link images to event
          const linkInserts = imageRecords.map(image => ({
            event_id: eventId,
            image_id: image.id
          }))
          console.log("Image link insert data:", linkInserts)

          const { error: linkError } = await supabase
            .from("event_images")
            .insert(linkInserts)

          if (linkError) {
            console.error("Image linking error:", linkError)
            throw new Error(`Failed to link images: ${linkError.message || JSON.stringify(linkError)}`)
          }
        }
      }

      toast.success("Event created successfully!")
      onSuccess()
      
    } catch (error: any) {
      // Comprehensive error logging
      console.error("=== EVENT CREATION ERROR ===")
      console.error("Raw error:", error)
      console.error("Error type:", typeof error)
      console.error("Error constructor:", error?.constructor?.name)
      
      // Try different ways to extract error information
      let errorInfo = {}
      try {
        errorInfo = {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          statusCode: error?.statusCode,
          status: error?.status,
          stringified: JSON.stringify(error),
          keys: Object.keys(error || {}),
          stack: error?.stack
        }
      } catch (serializationError) {
        console.error("Error serializing error object:", serializationError)
      }
      
      console.error("Error info:", errorInfo)
      console.error("=== END ERROR LOG ===")
      
      // More specific error messages based on error type
      let errorMessage = "Failed to create event"
      
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`
      } else if (error?.message) {
        if (error.message.includes("duplicate key")) {
          errorMessage = "An event with this information already exists"
        } else if (error.message.includes("violates foreign key")) {
          errorMessage = "Invalid reference data - please try again"
        } else if (error.message.includes("violates not-null")) {
          errorMessage = "Required field is missing - please fill all required fields"
        } else if (error.message.includes("permission denied")) {
          errorMessage = "You don't have permission to create events"
        } else {
          errorMessage = `Error: ${error.message}`
        }
      } else if (error?.code === "PGRST301" || error?.code === "23503") {
        errorMessage = "Database constraint error - please check your data"
      } else if (typeof error === 'string') {
        errorMessage = `Error: ${error}`
      } else {
        errorMessage = `Unexpected error occurred. Check console for details.`
      }
      
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`${isMobile ? 'mx-4' : 'max-w-3xl mx-auto'}`}>
      <Card className="bg-white shadow-lg border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl text-gray-800">Event Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium text-sm">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter event name"
                required
                className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700 font-medium text-sm">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe your event..."
                rows={3}
                className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm resize-none"
              />
            </div>

            {/* Date and Time */}
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
              {/* Start Date */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium text-sm">Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white border-gray-300 text-sm",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM dd") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium text-sm">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white border-gray-300 text-sm",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM dd") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="all-day"
                checked={formData.is_all_day}
                onCheckedChange={(checked) => handleInputChange("is_all_day", checked)}
              />
              <Label htmlFor="all-day" className="text-gray-700 text-sm">All day event</Label>
            </div>

            {/* Time Inputs (only if not all day) */}
            {!formData.is_all_day && (
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-gray-700 font-medium text-sm">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time" className="text-gray-700 font-medium text-sm">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-3`}>
              <div className="space-y-2">
                <Label htmlFor="location-name" className="text-gray-700 font-medium text-sm">Location Name</Label>
                <Input
                  id="location-name"
                  value={formData.location_name}
                  onChange={(e) => handleInputChange("location_name", e.target.value)}
                  placeholder="e.g., Main Gym, Room 201"
                  className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-700 font-medium text-sm">Full Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Full address (optional)"
                  className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                />
              </div>
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium text-sm">Event Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => handleInputChange("type", value)}>
                <SelectTrigger className="bg-white border-gray-300 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-md border-gray-300 shadow-2xl z-[100]">
                  <SelectItem value="in-person">In Person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URL (for virtual/hybrid events) */}
            {(formData.type === "virtual" || formData.type === "hybrid") && (
              <div className="space-y-2">
                <Label htmlFor="url" className="text-gray-700 font-medium text-sm">Event URL</Label>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) => handleInputChange("url", e.target.value)}
                  placeholder="https://..."
                  className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                />
              </div>
            )}

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium text-sm">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <Badge
                    key={category.id}
                    variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer capitalize text-xs",
                      selectedCategories.includes(category.id)
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "hover:bg-emerald-50 hover:border-emerald-300"
                    )}
                    onClick={() => toggleCategory(category.id)}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium text-sm">Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                    #{tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-600"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="bg-white border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm"
                />
                <Button type="button" onClick={addTag} variant="outline" size="sm">
                  Add
                </Button>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium text-sm">Event Images</Label>
              <ImageUpload
                onImagesChange={setEventImages}
                eventTitle={formData.name}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1 text-sm"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              >
                {isSubmitting ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 