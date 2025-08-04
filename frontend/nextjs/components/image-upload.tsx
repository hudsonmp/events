"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Sparkles, Loader2, Image as ImageIcon, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

interface ImageUploadProps {
  onImagesChange: (images: string[]) => void
  eventTitle: string
}

export function ImageUpload({ onImagesChange, eventTitle }: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [showAIModal, setShowAIModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [additionalPrompt, setAdditionalPrompt] = useState("")
  const [imageCount, setImageCount] = useState<1 | 3>(1)
  const [generatingImages, setGeneratingImages] = useState<{ [key: number]: string }>({})
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Handle manual file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      const newImagePaths: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Generate unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('event-images')
          .upload(fileName, file)

        if (error) {
          console.error('Upload error:', error)
          toast.error(`Failed to upload ${file.name}`)
          continue
        }

        newImagePaths.push(data.path)
      }

      if (newImagePaths.length > 0) {
        const updatedImages = [...uploadedImages, ...newImagePaths]
        setUploadedImages(updatedImages)
        onImagesChange(updatedImages)
        toast.success(`${newImagePaths.length} image(s) uploaded successfully!`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload images')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle AI image generation
  const handleAIGeneration = async () => {
    if (!eventTitle.trim()) {
      toast.error("Please enter an event title first")
      return
    }

    setIsGenerating(true)
    setGeneratingImages({})

    try {
      const prompt = `${eventTitle}${additionalPrompt ? ` ${additionalPrompt}` : ''}`
      
      // Generate images sequentially to show progress
      const newImagePaths: string[] = []
      
      for (let i = 0; i < imageCount; i++) {
        setGeneratingImages(prev => ({ ...prev, [i]: 'generating' }))
        
        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            size: '1024x1024',
            quality: 'standard',
            n: 1
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to generate image ${i + 1}`)
        }

        const data = await response.json()
        
        if (data.imagePath) {
          newImagePaths.push(data.imagePath)
          setGeneratingImages(prev => ({ ...prev, [i]: data.imagePath }))
        } else {
          throw new Error(`No image path received for image ${i + 1}`)
        }
      }

      if (newImagePaths.length > 0) {
        const updatedImages = [...uploadedImages, ...newImagePaths]
        setUploadedImages(updatedImages)
        onImagesChange(updatedImages)
        toast.success(`${newImagePaths.length} AI image(s) generated successfully!`)
      }
      
      setShowAIModal(false)
      setAdditionalPrompt("")
      setImageCount(1)
      
    } catch (error) {
      console.error('AI generation error:', error)
      toast.error('Failed to generate images with AI')
    } finally {
      setIsGenerating(false)
      setGeneratingImages({})
    }
  }

  // Remove image
  const removeImage = async (imagePath: string) => {
    try {
      // Delete from storage
      const { error } = await supabase.storage
        .from('event-images')
        .remove([imagePath])

      if (error) {
        console.warn('Error deleting from storage:', error)
      }

      // Update state
      const updatedImages = uploadedImages.filter(path => path !== imagePath)
      setUploadedImages(updatedImages)
      onImagesChange(updatedImages)
      
    } catch (error) {
      console.error('Error removing image:', error)
      toast.error('Failed to remove image')
    }
  }

  // Get image URL for display
  const getImageUrl = (path: string) => {
    return `${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL}/storage/v1/object/public/event-images/${path}`
  }

  return (
    <div className="space-y-4">
      {/* Upload Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Manual Upload */}
        <Card className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors cursor-pointer group bg-white"
              onClick={() => fileInputRef.current?.click()}>
          <CardContent className="p-4 text-center">
            <Upload className="h-6 w-6 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
            <h3 className="font-medium text-gray-800 mb-1 text-sm">Add Photos</h3>
            <p className="text-xs text-gray-500">Upload from your device</p>
            {isUploading && (
              <div className="mt-2 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-xs text-gray-600">Uploading...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Generation */}
        <Card className="border-2 border-blue-200 bg-blue-50 cursor-pointer group hover:bg-blue-100 transition-colors"
              onClick={() => setShowAIModal(true)}>
          <CardContent className="p-4 text-center relative">
            <div className="absolute top-2 right-2 text-xs text-blue-600 font-medium">
              recommended
            </div>
            <div className="flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-blue-600 mb-1 text-sm">Generate with AI</h3>
            <p className="text-xs text-gray-600">Create custom images</p>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Uploaded Images Gallery */}
      {uploadedImages.length > 0 && (
        <div className="space-y-2">
          <Label className="text-gray-800 font-medium">Uploaded Images</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((imagePath, index) => (
              <div key={imagePath} className="relative group">
                <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <Image
                    src={getImageUrl(imagePath)}
                    alt={`Event image ${index + 1}`}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gray-100"><div class="text-gray-500 text-xs font-medium">Failed to Load</div></div>'
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => removeImage(imagePath)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Generation Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="sm:max-w-lg mx-4 border border-gray-200 bg-white backdrop-blur-md text-gray-800 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Generate Images with AI
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview of what will be generated */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-600 text-sm mb-2">Generating images for:</p>
              <p className="text-gray-800 font-medium">"{eventTitle}"</p>
            </div>

            {/* Additional prompt */}
            <div className="space-y-2">
              <Label className="text-gray-800">Ideas (Optional)</Label>
              <Input
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="e.g., colorful, festive, students cheering..."
                className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            {/* Image count selection */}
            <div className="space-y-2">
              <Label className="text-gray-800">How many images?</Label>
              <div className="flex gap-2">
                <Button
                  variant={imageCount === 1 ? "default" : "outline"}
                  onClick={() => setImageCount(1)}
                  className={imageCount === 1 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }
                >
                  1 Image
                </Button>
                <Button
                  variant={imageCount === 3 ? "default" : "outline"}
                  onClick={() => setImageCount(3)}
                  className={imageCount === 3 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }
                >
                  3 Images
                </Button>
              </div>
            </div>

            {/* Generation progress */}
            {isGenerating && (
              <div className="space-y-2">
                <Label className="text-gray-800">Generating...</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: imageCount }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                      {generatingImages[i] === 'generating' ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      ) : generatingImages[i] ? (
                        <div className="w-full h-full relative rounded-lg overflow-hidden">
                          <Image
                            src={getImageUrl(generatingImages[i])}
                            alt={`Generated ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowAIModal(false)}
                disabled={isGenerating}
                className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAIGeneration}
                disabled={isGenerating || !eventTitle.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 