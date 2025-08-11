"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Sparkles, ArrowRight } from "lucide-react"
import { addProfilePicUrls } from "@/lib/instagram-utils"
import { useAuth } from "@/lib/contexts/auth-context"

interface Student {
  id: string
  username: string
  name: string | null
  profile_pic_url: string | null
}

interface StudentPreviewScrollProps {
  onSignUpClick?: () => void
  className?: string
}

export function StudentPreviewScroll({ onSignUpClick, className = "" }: StudentPreviewScrollProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalStudents: 0, activeToday: 0 })
  const { user } = useAuth()

  const supabase = createClient()

  useEffect(() => {
    loadStudents()
    loadStats()
  }, [])

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, username, name')
        .eq('processed', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        // Transform the data to include constructed profile pic URLs from storage bucket
        const studentsWithPics = addProfilePicUrls(data)
        
        // Shuffle the students for variety
        const shuffled = [...studentsWithPics].sort(() => 0.5 - Math.random())
        setStudents(shuffled)
      }
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalStudents: totalCount || 0,
        activeToday: Math.floor((totalCount || 0) * 0.3) // Simulate active users
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Don't show for authenticated users
  if (user) return null

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="animate-pulse">
            <div className="w-10 h-10 bg-purple-200 rounded-full" />
          </div>
          <div className="flex-1 animate-pulse">
            <div className="h-4 bg-purple-200 rounded w-32 mb-2" />
            <div className="h-3 bg-purple-200 rounded w-24" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 rounded-xl p-4 border border-purple-100 shadow-sm ${className}`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Who's on Henry AI</h3>
              <p className="text-xs text-gray-600">Join {stats.totalStudents}+ students</p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
            <Sparkles className="h-3 w-3 mr-1" />
            {stats.activeToday} active
          </Badge>
        </div>

        {/* Student Scroll */}
        <div className="relative overflow-hidden">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="flex space-x-3 w-fit"
          >
            {/* Duplicate students for seamless scroll */}
            {[...students, ...students].map((student, index) => (
              <motion.div
                key={`${student.id}-${index}`}
                className="flex-shrink-0 relative"
                whileHover={{ scale: 1.05 }}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                    <AvatarImage 
                      src={student.profile_pic_url || ''} 
                      alt="Student"
                      className="blur-sm" // Blur profile pictures
                    />
                    <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs blur-sm">
                      {student.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Overlay blur for username */}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-medium text-gray-700 blur-sm border border-gray-200">
                      @{student.username.replace(/./g, '●').slice(0, 6)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-purple-50 to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-blue-50 to-transparent pointer-events-none" />
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-purple-200">
          <div>
            <p className="text-sm font-medium text-gray-900">Ready to connect?</p>
            <p className="text-xs text-gray-600">Create your account to see who's in your classes</p>
          </div>
          <Button
            onClick={onSignUpClick}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 text-xs"
          >
            Join Now
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Fun stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{Math.floor(stats.totalStudents * 0.8)}</div>
            <div className="text-xs text-gray-500">class matches</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-pink-600">{Math.floor(stats.totalStudents * 0.6)}</div>
            <div className="text-xs text-gray-500">shared teachers</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{Math.floor(stats.totalStudents * 0.4)}</div>
            <div className="text-xs text-gray-500">new friends</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
