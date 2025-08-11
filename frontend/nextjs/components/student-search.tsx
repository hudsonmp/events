'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import { AuthModal } from '@/components/auth-modal'
import { Search, User, Instagram, UserPlus, ArrowRight, Users, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { addProfilePicUrls } from '@/lib/instagram-utils'
import { toast } from 'sonner'

interface Student {
  id: string
  username: string
  name: string | null
  profile_pic_url: string | null
}

interface StudentSearchProps {
  onStudentSelect: (student: Student | null) => void
  preselectedUsername?: string
}

export default function StudentSearch({ onStudentSelect, preselectedUsername }: StudentSearchProps) {
  const [searchQuery, setSearchQuery] = useState(preselectedUsername || '')
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualName, setManualName] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingInstagramUsername, setPendingInstagramUsername] = useState<string | null>(null)

  const { user, signUpWithEmail } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    // Create AbortController for request cancellation
    const abortController = new AbortController()
    
    if (searchQuery.length >= 1) {
      // Search instantly for better UX
      searchStudents(abortController.signal)
    } else {
      setSearchResults([])
    }

    // Cleanup: abort any pending requests when searchQuery changes
    return () => {
      abortController.abort()
    }
  }, [searchQuery])

  const searchStudents = async (signal?: AbortSignal) => {
    setIsSearching(true)
    try {
      console.log('Searching for:', searchQuery)
      
      // Try server-side search first with abort signal
      const response = await fetch(`/api/search-students?q=${encodeURIComponent(searchQuery)}`, {
        signal, // Add abort signal to request
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      // Check if request was aborted
      if (signal?.aborted) {
        return
      }
      
      // Check if response is ok and has content
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Check if response has content before parsing JSON
      const responseText = await response.text()
      
      // Check if request was aborted after getting response text
      if (signal?.aborted) {
        return
      }
      
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from server')
      }
      
      // Parse JSON safely
      let result
      try {
        result = JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', responseText)
        throw new Error('Invalid JSON response from server')
      }
      
      console.log('Server search results:', result.students)
      // Double-check if request was aborted before setting results
      if (!signal?.aborted) {
        setSearchResults(result.students || [])
      }
    } catch (error) {
      // If error is due to abort, don't process fallback
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Search request was cancelled')
        return
      }
      
      console.error('Error searching students:', error)
      
      // Fallback to client-side search (Supabase doesn't support AbortSignal directly)
      try {
        console.log('Trying client-side search fallback...')
        const escapedQuery = searchQuery.replace(/[%_]/g, '\\$&')
        
        const { data, error } = await supabase
          .from('students')
          .select('id, username, name')
          .or(`username.ilike.%${escapedQuery}%,name.ilike.%${escapedQuery}%`)
          .eq('processed', true)
          .order('username')
          .limit(15)

        if (error) throw error
        
        // Check if request was aborted before processing results
        if (!signal?.aborted) {
          const studentsWithPics = addProfilePicUrls(data || [])
          console.log('Client search fallback results:', studentsWithPics)
          setSearchResults(studentsWithPics)
        }
      } catch (fallbackError) {
        console.error('Both server and client search failed:', fallbackError)
        if (!signal?.aborted) {
          setSearchResults([])
        }
      }
    } finally {
      // Only update loading state if request wasn't aborted
      if (!signal?.aborted) {
        setIsSearching(false)
      }
    }
  }

  const handleStudentSelect = (student: Student) => {
    if (user) {
      // User is already authenticated, just select the student
      setSelectedStudent(student)
    } else {
      // User needs to create an account, store the Instagram username and show auth modal
      setPendingInstagramUsername(student.username)
      setShowAuthModal(true)
      toast.success(`Selected @${student.username}! Now create your account to continue.`)
    }
  }

  const handleManualEntry = () => {
    if (manualName.trim()) {
      if (user) {
        // User is authenticated, create manual student
        const manualStudent: Student = {
          id: 'manual-' + Date.now(),
          username: 'no-instagram',
          name: manualName.trim(),
          profile_pic_url: null
        }
        setSelectedStudent(manualStudent)
      } else {
        // User needs to create an account first
        setShowAuthModal(true)
        toast.success('Great! Now create your account to continue.')
      }
    }
  }

  const confirmSelection = () => {
    if (!user && !selectedStudent) {
      toast.error('Please select a student or create an account first')
      return
    }
    onStudentSelect(selectedStudent)
  }

  const handleAuthSuccess = async () => {
    // After successful auth, update the user's Instagram username
    if (pendingInstagramUsername && user) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ instagram_username: pendingInstagramUsername })
          .eq('id', user.id)
        
        if (!error) {
          // Find the student record for the selected username
          const { data: studentData } = await supabase
            .from('students')
            .select('*')
            .eq('username', pendingInstagramUsername)
            .single()

          if (studentData) {
            setSelectedStudent(studentData)
            toast.success('Account linked successfully!')
          }
        }
      } catch (error) {
        console.error('Error linking Instagram:', error)
      }
    }
    setShowAuthModal(false)
    setPendingInstagramUsername(null)
  }

  // Effect to handle auth state changes
  useEffect(() => {
    if (user && pendingInstagramUsername) {
      handleAuthSuccess()
    }
  }, [user, pendingInstagramUsername])

  return (
    <>
      <div className="max-w-lg mx-auto space-y-6 py-8">
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Instagram className="h-8 w-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {user ? 'Link Your Instagram' : 'Who are you?'}
          </h2>
          <p className="text-gray-600">
            {user 
              ? 'Search for your Instagram username or skip' 
              : 'Find yourself to create your account'
            }
          </p>
          {!user && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-center space-x-2 text-blue-700">
                <LogIn className="h-4 w-4" />
                <span className="text-sm">You'll create an account in the next step</span>
              </div>
            </div>
          )}
        </div>

      {!showManualEntry ? (
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search Instagram username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base border-gray-200 focus:border-pink-300 focus:ring-pink-100"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                {searchResults.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md
                        ${selectedStudent?.id === student.id 
                          ? 'ring-2 ring-pink-400 bg-pink-50' 
                          : 'hover:bg-gray-50'}`}
                      onClick={() => handleStudentSelect(student)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage 
                              src={student.profile_pic_url || undefined} 
                              alt={student.username}
                            />
                            <AvatarFallback className="bg-gradient-to-r from-pink-400 to-purple-400 text-white">
                              {student.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-gray-900">@{student.username}</p>
                              {student.name && (
                                <Badge variant="secondary" className="text-xs">
                                  {student.name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">Tap to select</p>
                          </div>
                          {selectedStudent?.id === student.id && (
                            <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                              <ArrowRight className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Results */}
          {searchQuery.length >= 1 && !isSearching && searchResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6"
            >
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No students found with "@{searchQuery}"</p>
              <Button
                variant="outline"
                onClick={() => setShowManualEntry(true)}
                className="border-gray-200 hover:border-pink-300 hover:bg-pink-50"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Manually Instead
              </Button>
            </motion.div>
          )}

          {/* Manual Entry Option */}
          <div className="text-center pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-3">Don't have Instagram?</p>
            <Button
              variant="ghost"
              onClick={() => setShowManualEntry(true)}
              className="text-pink-600 hover:text-pink-700 hover:bg-pink-50"
            >
              <User className="h-4 w-4 mr-2" />
              I don't have Instagram
            </Button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Manual Entry Form */}
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <User className="h-10 w-10 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Add Your Name</h3>
                <p className="text-sm text-gray-600">We'll create a profile for you</p>
              </div>

              <Input
                placeholder="Enter your name"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                className="h-12 text-base text-center border-purple-200 focus:border-purple-400"
              />

              {manualName.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-white rounded-lg border border-purple-200"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                        {manualName[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{manualName}</p>
                      <p className="text-sm text-gray-500">No Instagram</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={() => {
                setShowManualEntry(false)
                setManualName('')
              }}
              className="flex-1"
            >
              Back to Search
            </Button>
            <Button
              onClick={handleManualEntry}
              disabled={!manualName.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              Continue
            </Button>
          </div>
        </motion.div>
      )}

      {/* Continue Button */}
      {selectedStudent && !showManualEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6"
        >
          <Button
            onClick={confirmSelection}
            className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold"
          >
            Continue as {selectedStudent.name || selectedStudent.username}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      )}

      {selectedStudent && showManualEntry && manualName.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6"
        >
          <Button
            onClick={confirmSelection}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
          >
            Continue as {selectedStudent.name}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      )}
      </div>

      {/* Auth Modal for non-authenticated users */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false)
          setPendingInstagramUsername(null)
        }}
        defaultTab="signup"
      />
    </>
  )
}
