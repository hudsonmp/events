'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/auth-context'
import ScheduleUpload from '@/components/schedule-upload'
import ScheduleDisplay from '@/components/schedule-display'
import StudentSearch from '@/components/student-search'
import ClassmateDiscovery from '@/components/classmate-discovery'
import { StudentPreviewScroll } from '@/components/student-preview-scroll'
import { Upload, Users, Sparkles, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Student {
  id: string
  username: string
  name: string | null
  profile_pic_url: string | null
}

interface ParsedSchedule {
  periods: Array<{
    period: number
    time: string
    subject: string
    teacher: string
    room?: string
    mood?: string
    note?: string
  }>
}

interface SchedulePageState {
  step: 'upload' | 'search' | 'display' | 'social'
  currentStudent: Student | null
  parsedSchedule: ParsedSchedule | null
  uploadedImage: string | null
  isProcessing: boolean
}

export default function SchedulePage() {
  const [state, setState] = useState<SchedulePageState>({
    step: 'upload',
    currentStudent: null,
    parsedSchedule: null,
    uploadedImage: null,
    isProcessing: false
  })

  const [stats, setStats] = useState({
    totalUploads: 0,
    activeUsers: 0,
    classesMatched: 0
  })

  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
      
      setStats({
        totalUploads: count || 0,
        activeUsers: Math.floor((count || 0) * 0.7), // Simulate active users
        classesMatched: Math.floor((count || 0) * 12) // Simulate class matches
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleUploadComplete = (imageUrl: string) => {
    setState(prev => ({
      ...prev,
      uploadedImage: imageUrl,
      step: 'search' // Immediately go to search step
    }))

    // Try to get parsed schedule from background processing
    const checkForParsedSchedule = () => {
      const stored = localStorage.getItem('parsedSchedule')
      if (stored) {
        try {
          const parsedSchedule = JSON.parse(stored)
          setState(prev => ({
            ...prev,
            parsedSchedule: parsedSchedule
          }))
          localStorage.removeItem('parsedSchedule') // Clean up
        } catch (error) {
          console.warn('Error parsing stored schedule:', error)
        }
      }
    }

    // Check immediately and then periodically
    checkForParsedSchedule()
    const interval = setInterval(checkForParsedSchedule, 1000)
    
    // Clean up after 30 seconds
    setTimeout(() => {
      clearInterval(interval)
    }, 30000)
  }

  const handleStudentSelect = (student: Student | null) => {
    setState(prev => ({
      ...prev,
      currentStudent: student,
      step: 'display'
    }))
  }

  const handleScheduleSaved = () => {
    setState(prev => ({
      ...prev,
      step: 'social'
    }))
  }

  const resetFlow = () => {
    setState({
      step: 'upload',
      currentStudent: null,
      parsedSchedule: null,
      uploadedImage: null,
      isProcessing: false
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-green-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900">Henry AI Schedule</h1>
                <p className="text-xs text-gray-500">Find your class crew in 30 seconds</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              {stats.totalUploads} students joined
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex items-center space-x-2">
          {['upload', 'search', 'display', 'social'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-3 h-3 rounded-full transition-colors ${
                ['upload', 'search', 'display', 'social'].indexOf(state.step) >= index
                  ? 'bg-green-500' 
                  : 'bg-gray-200'
              }`} />
              {index < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          {state.step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    duration: 0.5,
                    type: "spring",
                    stiffness: 100
                  }}
                >
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="h-10 w-10 text-white" />
                  </div>
                </motion.div>
                
                <motion.h2 
                  className="text-3xl font-bold text-gray-900 mb-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  flex your schedule 📅
                </motion.h2>
                
                <motion.p 
                  className="text-gray-600 text-lg mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Find your classmates in 30 seconds
                </motion.p>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm mx-auto">
                  <Card className="border-green-100">
                    <CardContent className="p-3 text-center">
                      <div className="text-xl font-bold text-green-600">{stats.totalUploads}</div>
                      <div className="text-xs text-gray-500">students</div>
                    </CardContent>
                  </Card>
                  <Card className="border-yellow-100">
                    <CardContent className="p-3 text-center">
                      <div className="text-xl font-bold text-yellow-600">{stats.classesMatched}</div>
                      <div className="text-xs text-gray-500">matches</div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-100">
                    <CardContent className="p-3 text-center">
                      <div className="text-xl font-bold text-blue-600">{stats.activeUsers}</div>
                      <div className="text-xs text-gray-500">active</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <ScheduleUpload
                onUploadComplete={handleUploadComplete}
                isProcessing={state.isProcessing}
              />
            </motion.div>
          )}

          {state.step === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StudentSearch onStudentSelect={handleStudentSelect} />
            </motion.div>
          )}

          {state.step === 'display' && (
            <motion.div
              key="display"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ScheduleDisplay
                schedule={state.parsedSchedule || {
                  periods: [
                    { period: 1, time: '8:00-8:50', subject: 'Period 1', teacher: 'TBD' },
                    { period: 2, time: '9:00-9:50', subject: 'Period 2', teacher: 'TBD' },
                    { period: 3, time: '10:00-10:50', subject: 'Period 3', teacher: 'TBD' },
                    { period: 4, time: '11:00-11:50', subject: 'Lunch', teacher: '' },
                    { period: 5, time: '12:00-12:50', subject: 'Period 5', teacher: 'TBD' },
                    { period: 6, time: '1:00-1:50', subject: 'Period 6', teacher: 'TBD' }
                  ]
                }}
                student={state.currentStudent}
                onSave={handleScheduleSaved}
                uploadedImage={state.uploadedImage}
                isParsing={!state.parsedSchedule}
              />
            </motion.div>
          )}

          {state.step === 'social' && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ClassmateDiscovery
                schedule={state.parsedSchedule || {
                  periods: [
                    { period: 1, time: '8:00-8:50', subject: 'Period 1', teacher: 'TBD' },
                    { period: 2, time: '9:00-9:50', subject: 'Period 2', teacher: 'TBD' },
                    { period: 3, time: '10:00-10:50', subject: 'Period 3', teacher: 'TBD' },
                    { period: 4, time: '11:00-11:50', subject: 'Lunch', teacher: '' },
                    { period: 5, time: '12:00-12:50', subject: 'Period 5', teacher: 'TBD' },
                    { period: 6, time: '1:00-1:50', subject: 'Period 6', teacher: 'TBD' }
                  ]
                }}
                student={state.currentStudent}
                onStartOver={resetFlow}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      {state.step === 'upload' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Ready to go viral?</p>
              <p className="text-xs text-gray-500">Upload your schedule and find your crew</p>
            </div>
            <ArrowRight className="h-5 w-5 text-green-500 animate-pulse" />
          </div>
        </div>
      )}
    </div>
  )
}
