'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Share2, Instagram, MessageCircle, Sparkles, Edit, Camera, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import html2canvas from 'html2canvas'

interface SchedulePeriod {
  period: number
  time: string
  subject: string
  teacher: string
  room?: string
  mood?: string
  note?: string
}

interface Student {
  id: string
  username: string
  name: string | null
  profile_pic_url: string | null
}

interface ScheduleDisplayProps {
  schedule: {
    periods: SchedulePeriod[]
  }
  student: Student | null
  onSave: () => void
  uploadedImage: string | null
}

const MOOD_EMOJIS = [
  { emoji: '😎', label: 'hyped', color: 'bg-blue-100 text-blue-600' },
  { emoji: '😰', label: 'nervous', color: 'bg-yellow-100 text-yellow-600' },
  { emoji: '😐', label: 'bored', color: 'bg-gray-100 text-gray-600' },
  { emoji: '🤔', label: 'confused', color: 'bg-purple-100 text-purple-600' },
  { emoji: '🤩', label: 'excited', color: 'bg-pink-100 text-pink-600' },
  { emoji: '😴', label: 'sleepy', color: 'bg-indigo-100 text-indigo-600' },
]

export default function ScheduleDisplay({ schedule, student, onSave, uploadedImage }: ScheduleDisplayProps) {
  const [scheduleData, setScheduleData] = useState(schedule.periods)
  const [editingPeriod, setEditingPeriod] = useState<number | null>(null)
  const [tempNote, setTempNote] = useState('')
  const [showExportCard, setShowExportCard] = useState(false)
  const exportCardRef = useRef<HTMLDivElement>(null)

  const updateMood = (periodIndex: number, mood: string) => {
    setScheduleData(prev => 
      prev.map((period, index) => 
        index === periodIndex ? { ...period, mood } : period
      )
    )
  }

  const updateNote = (periodIndex: number, note: string) => {
    setScheduleData(prev => 
      prev.map((period, index) => 
        index === periodIndex ? { ...period, note } : period
      )
    )
    setEditingPeriod(null)
    setTempNote('')
  }

  const exportToInstagram = async () => {
    if (exportCardRef.current) {
      try {
        const canvas = await html2canvas(exportCardRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
          width: 400,
          height: 600
        })
        
        const link = document.createElement('a')
        link.download = 'my-schedule-2025.png'
        link.href = canvas.toDataURL()
        link.click()
      } catch (error) {
        console.error('Export failed:', error)
      }
    }
  }

  const shareToInstagram = () => {
    // Open Instagram with a pre-filled story template
    const text = encodeURIComponent('Find me at henryai.org/schedule 📅')
    if (navigator.share) {
      navigator.share({
        title: 'My 2025 Schedule',
        text: 'Check out my class schedule! Find yours at henryai.org/schedule',
        url: window.location.href
      })
    } else {
      window.open(`https://instagram.com/create/story`, '_blank')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center justify-center space-x-4 mb-4"
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={student?.profile_pic_url || undefined} />
            <AvatarFallback className="bg-gradient-to-r from-green-400 to-blue-400 text-white text-lg">
              {student?.name?.[0] || student?.username?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <h2 className="text-2xl font-bold text-gray-900">
              {student?.name || student?.username}'s Schedule
            </h2>
            <p className="text-gray-600">Add your mood for each class ✨</p>
          </div>
        </motion.div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-3">
        {scheduleData.map((period, index) => (
          <motion.div
            key={period.period}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center">
                  {/* Period & Time */}
                  <div className="bg-gradient-to-br from-green-500 to-blue-500 text-white p-4 min-w-[100px]">
                    <div className="text-center">
                      <div className="text-lg font-bold">{period.period}</div>
                      <div className="text-xs opacity-90">{period.time}</div>
                    </div>
                  </div>

                  {/* Subject & Teacher */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{period.subject}</h3>
                        <p className="text-sm text-gray-600">{period.teacher}</p>
                        {period.room && (
                          <p className="text-xs text-gray-500">{period.room}</p>
                        )}
                      </div>

                      {/* Mood Selector */}
                      <div className="flex items-center space-x-1">
                        {MOOD_EMOJIS.map(({ emoji, label, color }) => (
                          <motion.button
                            key={emoji}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all
                              ${period.mood === emoji ? color + ' scale-110' : 'hover:bg-gray-100'}`}
                            onClick={() => updateMood(index, emoji)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <span className="text-sm">{emoji}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Note Section */}
                    {editingPeriod === index ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Add a note about this class..."
                          value={tempNote}
                          onChange={(e) => setTempNote(e.target.value)}
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateNote(index, tempNote)
                            } else if (e.key === 'Escape') {
                              setEditingPeriod(null)
                              setTempNote('')
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => updateNote(index, tempNote)}
                            className="h-6 text-xs"
                          >
                            Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingPeriod(null)
                              setTempNote('')
                            }}
                            className="h-6 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        {period.note ? (
                          <p className="text-xs text-gray-600 italic bg-gray-50 px-2 py-1 rounded">
                            "{period.note}"
                          </p>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPeriod(index)
                              setTempNote(period.note || '')
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center space-x-1"
                          >
                            <Edit className="h-3 w-3" />
                            <span>Add note</span>
                          </button>
                        )}

                        {period.mood && (
                          <Badge className="text-xs">
                            {period.mood} {MOOD_EMOJIS.find(m => m.emoji === period.mood)?.label}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Export Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setShowExportCard(true)}
          className="h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Camera className="h-4 w-4 mr-2" />
          Export for Stories
        </Button>
        
        <Button
          onClick={shareToInstagram}
          variant="outline"
          className="h-12 border-pink-200 hover:border-pink-300 hover:bg-pink-50 text-pink-600"
        >
          <Instagram className="h-4 w-4 mr-2" />
          Share Now
        </Button>
      </div>

      {/* Continue Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          onClick={onSave}
          className="w-full h-12 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold"
        >
          <Users className="h-4 w-4 mr-2" />
          Find My Classmates
          <Sparkles className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>

      {/* Export Card Modal */}
      <AnimatePresence>
        {showExportCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExportCard(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl overflow-hidden max-w-sm"
            >
              {/* Export Card */}
              <div ref={exportCardRef} className="w-[400px] h-[600px] bg-gradient-to-br from-green-400 to-blue-500 relative">
                {/* Header */}
                <div className="absolute top-6 left-6 right-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={student?.profile_pic_url || undefined} />
                      <AvatarFallback className="bg-white text-green-600">
                        {student?.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {student?.name || student?.username}
                      </h3>
                      <p className="text-white/80 text-sm">2025 Schedule 💚💛</p>
                    </div>
                  </div>
                </div>

                {/* Schedule Grid */}
                <div className="absolute top-24 left-6 right-6 bottom-20 bg-white/10 backdrop-blur-sm rounded-xl p-4 overflow-y-auto">
                  <div className="space-y-2">
                    {scheduleData.slice(0, 6).map((period) => (
                      <div key={period.period} className="bg-white/20 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium text-sm">
                              {period.period}. {period.subject}
                            </div>
                            <div className="text-white/80 text-xs">
                              {period.teacher} • {period.time}
                            </div>
                          </div>
                          {period.mood && (
                            <span className="text-lg">{period.mood}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-6 left-6 right-6 text-center">
                  <p className="text-white font-medium">Find me at henryai.org</p>
                  <p className="text-white/80 text-xs">Henry AI Club 2025</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2">
                <Button 
                  onClick={exportToInstagram}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save to Photos
                </Button>
                <Button 
                  onClick={() => setShowExportCard(false)}
                  variant="ghost" 
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
