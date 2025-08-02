"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Clock, Globe, Sparkles, FileText, Tag, Building, Users, ExternalLink, Hash } from "lucide-react"
import { AIGenerateModal } from "@/components/ai-generate-modal"
import { ImageUpload } from "@/components/image-upload"
import { CustomDateTimePicker } from "@/components/ui/custom-datetime-picker"
import { LocationSearch } from "@/components/ui/location-search"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Image from "next/image"

export function AddEventForm() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [showAIModal, setShowAIModal] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    start_datetime: "",
    end_datetime: "",
    location_name: "",
    address: "",
    description: "",
    url: "",
    is_private: false,
    is_all_day: false,
    type: "in-person" as "in-person" | "virtual" | "hybrid",
    school_id: "",
    categories: [] as string[],
    tags: [] as string[]
  })
  const [newTag, setNewTag] = useState("")
  const [newCategory, setNewCategory] = useState("")
  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string}[]>([])
  const [schools, setSchools] = useState<{id: string, name: string}[]>([])
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load categories and schools on mount
  useEffect(() => {
    const loadData = async () => {
      // Load categories
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')
      
      if (categories) {
        setAvailableCategories(categories)
      }

      // Load schools
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('id, name')
        .order('name')
      
      if (schoolsData) {
        setSchools(schoolsData)
        // Auto-select Patrick Henry High School if available
        const phhs = schoolsData.find(school => school.name.includes('Patrick Henry'))
        if (phhs) {
          setFormData(prev => ({ ...prev, school_id: phhs.id }))
        }
      }
    }

    loadData()
  }, [supabase])

  // Auto-show AI modal after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAIModal(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAIResult = (result: { title: string; description: string; tags: string[] }) => {
    setFormData(prev => ({
      ...prev,
      name: result.title,
      description: result.description,
      tags: result.tags
    }))
    setShowAIModal(false)
    // Show image upload after AI generation
    setTimeout(() => setShowImageUpload(true), 500)
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addCategory = () => {
    if (newCategory && !formData.categories.includes(newCategory)) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }))
      setNewCategory("")
    }
  }

  const removeCategory = (categoryToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat !== categoryToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error("Event name is required")
      return
    }

    if (!formData.school_id) {
      toast.error("Please select a school")
      return
    }

    setIsSubmitting(true)
    
    try {
      // Ensure user exists in public.users table
      await fetch('/api/ensure-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })

      // Create event
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          name: formData.name,
          start_datetime: formData.start_datetime || null,
          end_datetime: formData.end_datetime || null,
          location_name: formData.location_name || null,
          address: formData.address || null,
          description: formData.description || null,
          url: formData.url || null,
          is_all_day: formData.is_all_day,
          type: formData.type,
          status: formData.is_private ? 'draft' : 'active',
          school_id: formData.school_id,
          profile_id: null // Will need to be set based on user's profile
        })
        .select()
        .single()

      if (error) throw error

      // Add categories
      if (formData.categories.length > 0 && event) {
        const categoryPromises = formData.categories.map(async (categoryId) => {
          const { error: catError } = await supabase
            .from('event_categories')
            .insert({
              event_id: event.id,
              category_id: categoryId
            })
          if (catError) throw catError
        })
        await Promise.all(categoryPromises)
      }

      // Add tags
      if (formData.tags.length > 0 && event) {
        const tagPromises = formData.tags.map(async (tag) => {
          const { error: tagError } = await supabase
            .from('event_tags')
            .insert({
              'event-id': event.id,
              tag: tag
            })
          if (tagError) throw tagError
        })
        await Promise.all(tagPromises)
      }

      // Add images if any
      if (images.length > 0 && event) {
        const imagePromises = images.map(async (imagePath) => {
          // Create image record
          const { data: imageRecord, error: imageError } = await supabase
            .from('images')
            .insert({
              storage_path: imagePath,
              url: `${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL}/storage/v1/object/public/event-images/${imagePath}`,
              event_id: event.id
            })
            .select()
            .single()

          if (imageError) throw imageError

          // Link image to event
          const { error: linkError } = await supabase
            .from('event_images')
            .insert({
              event_id: event.id,
              image_id: imageRecord.id
            })

          if (linkError) throw linkError
        })

        await Promise.all(imagePromises)
      }

      toast.success("Event created successfully!")
      router.push("/")
      
    } catch (error: any) {
      console.error("Error creating event:", error)
      toast.error("Failed to create event")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex w-full h-full">
      {/* Left Side - Image Area (1/3) */}
      <div className="flex-1 relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex flex-col items-center justify-center p-8">
        <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-1">
          <div className="w-full h-full rounded-2xl overflow-hidden relative">
            <Image
              src="/ai-club-logo.png"
              alt="Event placeholder"
              fill
              className="object-cover"
              priority
            />
            
            {/* Conditional overlay - always show button if no images, hover if images exist */}
            <div className={`absolute inset-0 transition-opacity ${
              images.length === 0 
                ? 'opacity-100' 
                : 'opacity-0 hover:opacity-100 bg-black/20'
            }`}>
              <button
                onClick={() => setShowImageUpload(true)}
                className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 font-medium shadow-lg transition-all hover:scale-105 flex items-center gap-2 text-sm"
              >
                <Sparkles className="h-4 w-4" />
                Generate Images With AI
              </button>
            </div>
          </div>
        </div>
        
        {/* Add Image Text */}
        <button
          onClick={() => setShowImageUpload(true)}
          className="mt-4 text-slate-200 hover:text-white transition-colors text-sm font-medium"
        >
          add image
        </button>
      </div>

      {/* Right Side - Form (2/3) */}
      <div className="flex-[2] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col h-full">
        <div className="flex-1 max-w-2xl mx-auto w-full p-8 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Name */}
            <div>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Event Name"
                className="text-2xl font-medium bg-transparent border-none text-slate-100 placeholder:text-slate-400 px-0 focus:ring-0 focus:border-none"
              />
            </div>

            {/* School Selection */}
            <div className="flex items-center space-x-4">
              <Building className="h-5 w-5 text-slate-300" />
              <div className="flex-1">
                <Label className="text-slate-300 text-sm">School</Label>
                <Select value={formData.school_id} onValueChange={(value) => handleInputChange("school_id", value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id} className="text-slate-100">
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Clock className="h-5 w-5 text-slate-300" />
                <div className="flex-1">
                  <Label className="text-slate-300 text-sm">Start</Label>
                  <CustomDateTimePicker
                    value={formData.start_datetime}
                    onChange={(date) => handleInputChange("start_datetime", date)}
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Clock className="h-5 w-5 text-slate-300" />
                <div className="flex-1">
                  <Label className="text-slate-300 text-sm">End</Label>
                  <CustomDateTimePicker
                    value={formData.end_datetime}
                    onChange={(date) => handleInputChange("end_datetime", date)}
                    className="bg-slate-800 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-slate-300" />
                  <span className="text-slate-100">All day event</span>
                </div>
                <Switch
                  checked={formData.is_all_day}
                  onCheckedChange={(checked) => handleInputChange("is_all_day", checked)}
                />
              </div>
            </div>

            {/* Event Type */}
            <div className="flex items-center space-x-4">
              <Users className="h-5 w-5 text-slate-300" />
              <div className="flex-1">
                <Label className="text-slate-300 text-sm">Event Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="in-person" className="text-slate-100">In Person</SelectItem>
                    <SelectItem value="virtual" className="text-slate-100">Virtual</SelectItem>
                    <SelectItem value="hybrid" className="text-slate-100">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center space-x-4">
              <MapPin className="h-5 w-5 text-slate-300" />
              <div className="flex-1">
                <Label className="text-slate-300 text-sm">Location</Label>
                <LocationSearch
                  value={formData.location_name}
                  onChange={(location) => handleInputChange("location_name", location)}
                  onAddressChange={(address) => handleInputChange("address", address)}
                  placeholder="Add Event Location"
                  className="bg-transparent border-none text-slate-100 placeholder:text-slate-400 px-0 focus:ring-0"
                />
              </div>
            </div>

            {/* URL */}
            <div className="flex items-center space-x-4">
              <ExternalLink className="h-5 w-5 text-slate-300" />
              <div className="flex-1">
                <Label className="text-slate-300 text-sm">Event URL (optional)</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => handleInputChange("url", e.target.value)}
                  placeholder="https://example.com"
                  className="bg-transparent border-none text-slate-100 placeholder:text-slate-400 px-0 focus:ring-0"
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start space-x-4">
              <FileText className="h-5 w-5 text-slate-300 mt-1" />
              <div className="flex-1">
                <Label className="text-slate-300 text-sm">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Add Description"
                  className="bg-transparent border-none text-slate-100 placeholder:text-slate-400 px-0 focus:ring-0 resize-none min-h-[80px]"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex items-start space-x-4">
              <Tag className="h-5 w-5 text-slate-300 mt-1" />
              <div className="flex-1 space-y-3">
                <Label className="text-slate-300 text-sm">Categories</Label>
                
                {/* Category Selection */}
                <div className="flex gap-2">
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                      <SelectValue placeholder="Add a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="text-slate-100">
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    onClick={addCategory}
                    disabled={!newCategory}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-100"
                  >
                    Add
                  </Button>
                </div>

                {/* Selected Categories */}
                <div className="flex flex-wrap gap-2">
                  {formData.categories.map((categoryId) => {
                    const category = availableCategories.find(c => c.id === categoryId)
                    return (
                      <Badge
                        key={categoryId}
                        variant="secondary"
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {category?.name}
                        <button
                          type="button"
                          onClick={() => removeCategory(categoryId)}
                          className="ml-1 text-white/70 hover:text-white"
                        >
                          ×
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex items-start space-x-4">
              <Hash className="h-5 w-5 text-slate-300 mt-1" />
              <div className="flex-1 space-y-3">
                <Label className="text-slate-300 text-sm">Tags</Label>
                
                {/* Tag Input */}
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag"
                    className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400"
                  />
                  <Button
                    type="button"
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-100"
                  >
                    Add
                  </Button>
                </div>

                {/* Selected Tags */}
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="bg-slate-700 text-slate-100 border-slate-600 hover:bg-slate-600"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 text-slate-400 hover:text-slate-100"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Event Options */}
            <div className="space-y-4 pt-4">
              <h3 className="text-slate-100 font-medium">Event Options</h3>
              
              {/* Private Event Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-slate-300" />
                  <span className="text-slate-100">Private Event</span>
                </div>
                <Switch
                  checked={formData.is_private}
                  onCheckedChange={(checked) => handleInputChange("is_private", checked)}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Create Event Button - Fixed at bottom */}
        <div className="p-8 border-t border-slate-700">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim() || !formData.school_id}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 h-12 text-lg font-medium rounded-xl"
          >
            {isSubmitting ? "Creating Event..." : "Create Event"}
          </Button>
        </div>
      </div>

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onResult={handleAIResult}
      />

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Add Event Images</h3>
              <button
                onClick={() => setShowImageUpload(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <ImageUpload
              onImagesChange={setImages}
              eventTitle={formData.name}
            />
          </div>
        </div>
      )}
    </div>
  )
} 