"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Brain, 
  Palette, 
  Leaf, 
  Music, 
  Gamepad2, 
  GraduationCap,
  Users,
  Trophy,
  Heart,
  Coffee,
  BookOpen,
  Code
} from "lucide-react"

interface Category {
  id: string
  name: string
  event_count?: number
}

interface CategoriesSectionProps {
  onCategoryClick?: (categoryId: string, categoryName: string) => void
}

const categoryIcons: { [key: string]: React.ReactNode } = {
  "AI": <Brain className="h-6 w-6" />,
  "Artificial Intelligence": <Brain className="h-6 w-6" />,
  "Arts & Culture": <Palette className="h-6 w-6" />,
  "Arts": <Palette className="h-6 w-6" />,
  "Climate": <Leaf className="h-6 w-6" />,
  "Environment": <Leaf className="h-6 w-6" />,
  "Music": <Music className="h-6 w-6" />,
  "Gaming": <Gamepad2 className="h-6 w-6" />,
  "Education": <GraduationCap className="h-6 w-6" />,
  "Academic": <GraduationCap className="h-6 w-6" />,
  "Social": <Users className="h-6 w-6" />,
  "Community": <Users className="h-6 w-6" />,
  "Sports": <Trophy className="h-6 w-6" />,
  "Athletics": <Trophy className="h-6 w-6" />,
  "Wellness": <Heart className="h-6 w-6" />,
  "Health": <Heart className="h-6 w-6" />,
  "Food": <Coffee className="h-6 w-6" />,
  "Study": <BookOpen className="h-6 w-6" />,
  "Technology": <Code className="h-6 w-6" />,
  "Tech": <Code className="h-6 w-6" />
}

const getCategoryIcon = (categoryName: string) => {
  // Try exact match first
  if (categoryIcons[categoryName]) {
    return categoryIcons[categoryName]
  }
  
  // Try partial matches
  const lowerName = categoryName.toLowerCase()
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return icon
    }
  }
  
  // Default icon
  return <Users className="h-6 w-6" />
}

export function CategoriesSection({ onCategoryClick }: CategoriesSectionProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select(`
            id,
            name,
            event_categories(count)
          `)
          .limit(12)

        if (data && !error) {
          // Sort by event count (most popular first)
          const categoriesWithCount = data.map(cat => ({
            ...cat,
            event_count: cat.event_categories?.length || 0
          })).sort((a, b) => (b.event_count || 0) - (a.event_count || 0))
          
          setCategories(categoriesWithCount)
        }
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [supabase])

  const handleCategoryClick = (category: Category) => {
    onCategoryClick?.(category.id, category.name)
  }

  if (loading) {
    return (
      <div className="px-4 py-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Categories</h2>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Categories</h2>
        <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
          View All
        </button>
      </div>
      
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {categories.slice(0, 12).map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className="flex-shrink-0 bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 transition-colors min-h-[80px] min-w-[80px]"
          >
            <div className="text-blue-600">
              {getCategoryIcon(category.name)}
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight">
              {category.name.length > 10 ? `${category.name.substring(0, 10)}...` : category.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}