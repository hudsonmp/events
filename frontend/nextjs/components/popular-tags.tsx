"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Hash } from "lucide-react"

interface PopularTag {
  tag: string
  count: number
}

interface PopularTagsProps {
  onTagClick?: (tag: string) => void
  selectedTag?: string | null
}

export function PopularTags({ onTagClick, selectedTag }: PopularTagsProps) {
  const [tags, setTags] = useState<PopularTag[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        // Get all tags and count their usage
        const { data, error } = await supabase
          .from("event_tags")
          .select(`
            tag,
            events!inner(status)
          `)
          .eq("events.status", "active")

        if (data && !error) {
          // Count tag occurrences
          const tagCounts: { [key: string]: number } = {}
          data.forEach((item: any) => {
            const tag = item.tag.toLowerCase()
            tagCounts[tag] = (tagCounts[tag] || 0) + 1
          })

          // Convert to array and sort by count
          const popularTags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10) // Top 10 tags

          setTags(popularTags)
        }
      } catch (error) {
        console.error("Error fetching popular tags:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPopularTags()
  }, [supabase])

  const handleTagClick = (tag: string) => {
    onTagClick?.(tag)
  }

  const getTagColor = (index: number) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-purple-100 text-purple-800 border-purple-200", 
      "bg-green-100 text-green-800 border-green-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200",
      "bg-pink-100 text-pink-800 border-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-red-100 text-red-800 border-red-200",
      "bg-teal-100 text-teal-800 border-teal-200",
      "bg-orange-100 text-orange-800 border-orange-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200"
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Tags</h2>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-full h-8 w-20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-gray-600" />
          <h2 className="text-xl font-bold text-gray-900">Popular Tags</h2>
        </div>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 hover:scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(209 213 219) transparent' }}>
        {tags.map((tagData, index) => {
          const isSelected = selectedTag === tagData.tag
          return (
            <button
              key={tagData.tag}
              onClick={() => handleTagClick(tagData.tag)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all hover:scale-105 ${
                isSelected 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' 
                  : getTagColor(index)
              }`}
            >
              #{tagData.tag}
              {tagData.count > 1 && (
                <span className={`ml-1 text-xs ${isSelected ? 'opacity-90' : 'opacity-75'}`}>
                  {tagData.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}