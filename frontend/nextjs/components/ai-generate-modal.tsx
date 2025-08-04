"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

interface AIGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onResult: (result: { title: string; description: string; tags: string[] }) => void
}

interface GroqResponse {
  title: string
  description: string
  tags: string[]
}

export function AIGenerateModal({ isOpen, onClose, onResult }: AIGenerateModalProps) {
  const [eventDescription, setEventDescription] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleClose = () => {
    setEventDescription("")
    setAdditionalInfo("")
    setIsGenerating(false)
    onClose()
  }

  const handleGenerate = async () => {
    if (!eventDescription.trim()) {
      toast.error("Please provide an event description")
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: eventDescription,
          additionalInfo: additionalInfo
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate event details")
      }

      const data: GroqResponse = await response.json()
      
      onResult({
        title: data.title,
        description: data.description,
        tags: data.tags
      })
      
      handleClose()
      
    } catch (error) {
      console.error("Error generating event:", error)
      toast.error("Failed to generate event details. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200"
          >
            {/* Header with close button */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-800">Generate with AI</h3>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Event Description */}
              <div className="space-y-2">
                <Label className="text-gray-800 font-medium">Describe your event</Label>
                <p className="text-gray-600 text-sm mb-3">Give us a brief idea of what you're planning</p>
                <Textarea
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="e.g., A basketball game between Patrick Henry and Lincoln High School..."
                  rows={3}
                  className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 resize-none rounded-xl"
                />
              </div>

              {/* Additional Info */}
              <div className="space-y-2">
                <Label className="text-gray-800 font-medium">Additional details (optional)</Label>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="e.g., championship game, food trucks, special guests..."
                  rows={2}
                  className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 resize-none rounded-xl"
                />
              </div>

              {/* Generate Button */}
              <div className="pt-4">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !eventDescription.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500 h-12 rounded-xl font-semibold"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Event
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
} 