"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/contexts/auth-context"
import { useIsMobile } from "@/components/ui/use-mobile"
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
  const isMobile = useIsMobile()
  
  const [showAIModal, setShowAIModal] = useState(false)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showAIPill, setShowAIPill] = useState(true)
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

  const handleOpenAIModal = () => {
    setShowAIModal(true)
  }

  const handleCloseAIModal = () => {
    setShowAIModal(false)
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

    if (!formData.start_datetime) {
      toast.error("Please select a start date and time")
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
              event_id: event.id,
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
    <div className="flex flex-col w-full min-h-screen bg-white">
      {/* Image Area - Full width on mobile, centered on desktop */}
      <div className="w-full bg-white flex justify-center py-6 pt-16">
        <div className="relative w-full max-w-sm aspect-square mx-auto">
          <div className="w-full h-full rounded-2xl overflow-hidden relative bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 border border-gray-200">
            <Image
              src="/ai-club-logo.png"
              alt="Event placeholder"
              fill
              className="object-cover rounded-2xl"
              priority
            />
            
            {/* Generate/Upload Button - Pencil with Plus */}
            <button
              onClick={() => setShowImageUpload(true)}
              className="absolute bottom-3 right-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all hover:scale-105 flex items-center justify-center"
              title="Generate images with AI or upload"
            >
              <div className="relative">
                <Sparkles className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 bg-white text-blue-600 rounded-full w-3 h-3 flex items-center justify-center text-xs font-bold">+</div>
              </div>
            </button>
          </div>
          
          {/* Add Image Text */}
          <button
            onClick={() => setShowImageUpload(true)}
            className="mt-3 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium block w-full text-center"
          >
            add image
          </button>
        </div>
      </div>

      {/* AI Generate Pill Button */}
      {showAIPill && (
        <div className="w-full flex justify-center px-4 pb-4">
          <button
            onClick={handleOpenAIModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium shadow-lg transition-all hover:scale-105 text-sm"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </button>
        </div>
      )}

      {/* Form Area */}
      <div className="flex-1 bg-white px-4 pb-4">
        <div className="max-w-2xl mx-auto w-full">
          <form onSubmit={handleSubmit} className={`${isMobile ? 'space-y-6' : 'space-y-8'}`}>
            {/* Event Name */}
            <div>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Event Name"
                className={`${isMobile ? 'text-xl h-14' : 'text-2xl h-16'} font-medium bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 rounded-xl`}
              />
            </div>

            {/* School Selection */}
            <div className="space-y-2">
              <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
                <Building className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">School</Label>
              </div>
              <Select value={formData.school_id} onValueChange={(value) => handleInputChange("school_id", value)}>
                <SelectTrigger className="bg-white border border-gray-200 text-gray-900 h-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-xl rounded-xl">
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id} className="text-gray-800 hover:bg-gray-50">
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">Start</Label>
              </div>
              <CustomDateTimePicker
                value={formData.start_datetime}
                onChange={(date) => handleInputChange("start_datetime", date)}
                className="bg-white border border-gray-200 text-gray-900 h-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <div className="flex items-center space-x-3 mb-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">End</Label>
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
                placeholder="Add Event Location"
                className="bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-12 rounded-xl"
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <ExternalLink className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">Event URL (optional)</Label>
              </div>
              <Input
                value={formData.url}
                onChange={(e) => handleInputChange("url", e.target.value)}
                placeholder="https://example.com"
                className="bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-12 rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">Description</Label>
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Add Description"
                className="bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[100px] rounded-xl"
              />
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Tag className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">Categories</Label>
              </div>
              
              {/* Category Selection */}
              <div className="flex gap-3">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="bg-white border border-gray-200 text-gray-900 h-12 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1">
                    <SelectValue placeholder="Add a category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-xl rounded-xl">
                    {availableCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id} className="text-gray-800 hover:bg-gray-50">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addCategory}
                  disabled={!newCategory}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-12 rounded-xl"
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
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1 rounded-full"
                    >
                      {category?.name}
                      <button
                        type="button"
                        onClick={() => removeCategory(categoryId)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Hash className="h-5 w-5 text-gray-600" />
                <Label className="text-gray-700 text-sm font-medium">Tags</Label>
              </div>
              
              {/* Tag Input */}
              <div className="flex gap-3">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag"
                  className="bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-12 rounded-xl flex-1"
                />
                <Button
                  type="button"
                  onClick={addTag}
                  disabled={!newTag.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-12 rounded-xl"
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
                    className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 px-3 py-1 rounded-full"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Event Options */}
            <div className="space-y-4 pt-6">
              <h3 className="text-gray-800 font-semibold text-lg">Options</h3>
              
              {/* Private Event Toggle */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-600" />
                  <div>
                    <span className="text-gray-800 font-medium">Visibility</span>
                    <p className="text-sm text-gray-500">
                      {formData.is_private ? "Private" : "Public"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.is_private}
                  onCheckedChange={(checked) => handleInputChange("is_private", checked)}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Create Event Button */}
        <div className="mt-6 px-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim() || !formData.school_id || !formData.start_datetime}
            className={`w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 ${isMobile ? 'h-14 text-lg' : 'h-12 text-base'} font-semibold rounded-xl shadow-lg transition-all duration-200`}
          >
            {isSubmitting ? "Creating Event..." : "Create Event"}
          </Button>
        </div>
      </div>

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIModal}
        onClose={handleCloseAIModal}
        onResult={handleAIResult}
      />

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
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
              eventTitle={formData.name}
            />
          </div>
        </div>
      )}
    </div>
  )
} 