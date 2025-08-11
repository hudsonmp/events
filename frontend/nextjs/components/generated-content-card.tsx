"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, ExternalLink, ChevronDown, ChevronUp, Sparkles, Calendar, Lock } from "lucide-react"
import { toast } from "sonner"
import FullscreenContentModal from "./fullscreen-content-modal"

interface GeneratedContentCardProps {
  title?: string
  content: string
  type?: "lesson_plan" | "rubric" | "quiz" | "email" | "general"
  onShare?: () => void
  calLink?: string
  onMeetingSignup?: () => void
}

export default function GeneratedContentCard({ 
  title = "Generated Content", 
  content, 
  type = "general",
  onShare,
  calLink,
  onMeetingSignup
}: GeneratedContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setIsCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy content")
    }
  }

  const getTypeIcon = () => {
    switch (type) {
      case "lesson_plan":
        return "📚"
      case "rubric":
        return "📊"
      case "quiz":
        return "❓"
      case "email":
        return "📧"
      default:
        return "✨"
    }
  }

  const getTypeColor = () => {
    switch (type) {
      case "lesson_plan":
        return "from-blue-500/10 to-blue-600/10 border-blue-200"
      case "rubric":
        return "from-green-500/10 to-green-600/10 border-green-200"
      case "quiz":
        return "from-purple-500/10 to-purple-600/10 border-purple-200"
      case "email":
        return "from-orange-500/10 to-orange-600/10 border-orange-200"
      default:
        return "from-emerald-500/10 to-emerald-600/10 border-emerald-200"
    }
  }

  // Preview is first 200 characters
  const preview = content.length > 200 ? content.substring(0, 200) + "..." : content

  const handleFullscreen = () => {
    if (onMeetingSignup) {
      onMeetingSignup()
    } else {
      setShowFullscreen(true)
    }
  }

  return (
    <>
      <Card 
        className={`bg-gradient-to-br ${getTypeColor()} shadow-sm hover:shadow-md transition-all duration-200 max-w-[95%] cursor-pointer`}
        onClick={handleFullscreen}
      >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <span className="text-xl">{getTypeIcon()}</span>
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onMeetingSignup && (
              <Lock className="h-4 w-4 text-orange-500" title="Sign up for a meeting to view full content" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="prose prose-sm max-w-none text-gray-700">
          {isExpanded ? (
            <div className="whitespace-pre-wrap">{content}</div>
          ) : (
            <div className="whitespace-pre-wrap text-gray-600">
              {preview}
              {content.length > 200 && (
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="text-emerald-600 hover:text-emerald-700 ml-1 font-medium"
                >
                  Read more
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleCopy()
            }}
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {isCopied ? "Copied!" : "Copy"}
          </Button>
          
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onShare()
              }}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Share
            </Button>
          )}
          
          {onMeetingSignup && calLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onMeetingSignup()
              }}
              className="flex items-center gap-2 text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <Calendar className="h-4 w-4" />
              Book Meeting
            </Button>
          )}
          
          <div className="flex-1" />
          
          <div className="text-xs text-gray-500">
            Generated by Henry AI
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Fullscreen Modal */}
    {!onMeetingSignup && (
      <FullscreenContentModal
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        title={title}
        content={content}
        contentType={type}
      />
    )}
    </>
  )
}
