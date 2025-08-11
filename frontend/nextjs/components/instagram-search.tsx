"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { addProfilePicUrls } from "@/lib/instagram-utils"
import { Search, Instagram, Check, UserCheck, Users } from "lucide-react"

interface Student {
  id: string
  username: string
  name: string | null
  profile_pic_url: string | null
}

interface InstagramSearchProps {
  onSelect: (username: string | null) => void
  onSkip: () => void
  loading?: boolean
}

export function InstagramSearch({ onSelect, onSkip, loading = false }: InstagramSearchProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ totalStudents: 0, recentJoined: 0 })

  const supabase = createClient()

  useEffect(() => {
    loadStudents()
    loadStats()
  }, [])

  const loadStudents = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, username, name')
        .eq('processed', true)
        .order('username')
        .limit(100)

      if (!error && data) {
        // Transform the data to include constructed profile pic URLs from storage bucket
        const studentsWithPics = addProfilePicUrls(data)
        
        setStudents(studentsWithPics)
      }
    } catch (error) {
      console.error('Error loading students:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { count: totalCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      setStats({
        totalStudents: totalCount || 0,
        recentJoined: Math.floor((totalCount || 0) * 0.15) // Simulate recent joins
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students.slice(0, 12)
    
    const query = searchQuery.toLowerCase()
    return students.filter(student => 
      student.username.toLowerCase().includes(query) ||
      student.name?.toLowerCase().includes(query)
    ).slice(0, 20)
  }, [students, searchQuery])

  const handleSelect = (student: Student) => {
    setSelectedStudent(student)
  }

  const handleConfirm = () => {
    onSelect(selectedStudent?.username || null)
  }

  const handleSkip = () => {
    onSelect(null)
    onSkip()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Instagram className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Connect Your Instagram</h2>
        <p className="text-gray-600">
          Find yourself in our student directory to connect with classmates
        </p>
        
        {/* Stats */}
        <div className="flex justify-center space-x-6 pt-2">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalStudents}</div>
            <div className="text-xs text-gray-500">students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">{stats.recentJoined}</div>
            <div className="text-xs text-gray-500">joined recently</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by @username or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base border-2 focus:border-purple-500 rounded-xl"
          disabled={loading}
        />
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Users className="h-4 w-4 mr-2 text-purple-600" />
            {searchQuery ? 'Search Results' : 'Popular Students'}
          </h3>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            {filteredStudents.length} found
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div className="h-4 bg-gray-200 rounded w-20" />
                    <div className="h-3 bg-gray-200 rounded w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AnimatePresence>
                {filteredStudents.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedStudent?.id === student.id 
                          ? 'ring-2 ring-purple-500 bg-purple-50' 
                          : 'hover:border-purple-300'
                      }`}
                      onClick={() => handleSelect(student)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center space-y-2 relative">
                          {selectedStudent?.id === student.id && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                          
                          <Avatar className="w-12 h-12">
                            <AvatarImage 
                              src={student.profile_pic_url || ''} 
                              alt={student.username}
                            />
                            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                              {student.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="text-center">
                            <div className="font-medium text-sm text-gray-900">
                              @{student.username}
                            </div>
                            {student.name && (
                              <div className="text-xs text-gray-500 truncate max-w-full">
                                {student.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {!isLoading && filteredStudents.length === 0 && searchQuery && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <Instagram className="h-12 w-12 mx-auto mb-2 opacity-50" />
              No students found matching "{searchQuery}"
            </div>
            <Button
              variant="outline"
              onClick={handleSkip}
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              Skip this step
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4 border-t">
        {selectedStudent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-50 rounded-lg p-4 mb-4"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage 
                  src={selectedStudent.profile_pic_url || ''} 
                  alt={selectedStudent.username}
                />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm">
                  {selectedStudent.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  Selected: @{selectedStudent.username}
                </div>
                {selectedStudent.name && (
                  <div className="text-sm text-gray-600">{selectedStudent.name}</div>
                )}
              </div>
              <UserCheck className="h-5 w-5 text-purple-600" />
            </div>
          </motion.div>
        ) : null}

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 border-gray-300 hover:bg-gray-50"
          >
            Skip for now
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedStudent}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? 'Connecting...' : 'Connect Account'}
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500">
          You can always update this later in your profile settings
        </p>
      </div>
    </div>
  )
}
