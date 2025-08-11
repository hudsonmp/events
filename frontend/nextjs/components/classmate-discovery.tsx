'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, MessageCircle, Eye, Flame as Fire, Heart, 
  RefreshCw, Instagram, Share2, Trophy, 
  TrendingUp, Zap, Target, ChevronRight,
  Clock, UserPlus, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

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

interface ClassmateMatch {
  student: Student
  sharedClasses: number
  matchPercentage: number
  sharedPeriods: SchedulePeriod[]
  reactions: string[]
  lastSeen: string
}

interface ClassmateDiscoveryProps {
  schedule: {
    periods: SchedulePeriod[]
  }
  student: Student | null
  onStartOver: () => void
}

// Fetch real classmates from API using authenticated user
const fetchRealClassmates = async (schedule: { periods: SchedulePeriod[] }): Promise<ClassmateMatch[]> => {
  try {
    const response = await fetch('/api/find-classmates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        schedule
      })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch classmates')
    }

    const data = await response.json()
    
    if (data.message) {
      // API returned a message (like "Upload your schedule first")
      console.log('API message:', data.message)
    }
    
    return data.classmates || []
  } catch (error) {
    console.error('Error fetching classmates:', error)
    return []
  }
}

export default function ClassmateDiscovery({ schedule, student, onStartOver }: ClassmateDiscoveryProps) {
  const [classmates, setClassmates] = useState<ClassmateMatch[]>([])
  const [activeTab, setActiveTab] = useState('matches')
  const [selectedClassmate, setSelectedClassmate] = useState<ClassmateMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Fetch real classmates
    const loadClassmates = async () => {
      try {
        const realClassmates = await fetchRealClassmates(schedule)
        setClassmates(realClassmates)
        setLoading(false)
        
        if (realClassmates.length > 0) {
          setShowCelebration(true)
          // Hide celebration after 3 seconds
          const timer = setTimeout(() => setShowCelebration(false), 3000)
          return () => clearTimeout(timer)
        }
      } catch (error) {
        console.error('Error loading classmates:', error)
        setLoading(false)
      }
    }

    // Small delay for better UX
    const loadTimer = setTimeout(loadClassmates, 1500)
    return () => clearTimeout(loadTimer)
  }, [schedule])

  const sendDM = (classmate: ClassmateMatch) => {
    const message = encodeURIComponent(`Hey! I saw we have ${classmate.sharedClasses} classes together this semester. Want to connect?`)
    window.open(`https://instagram.com/direct/new/?text=${message}`, '_blank')
  }

  const shareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Schedule is Live!',
        text: 'Just uploaded my schedule to Henry AI Club. Check it out!',
        url: window.location.href
      })
    }
  }

  const topClassmate = classmates[0]
  const totalMatches = classmates.reduce((acc, c) => acc + c.sharedClasses, 0)

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Users className="h-8 w-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Finding your crew...</h2>
        <p className="text-gray-600">Matching you with classmates</p>
        <div className="max-w-xs mx-auto mt-4">
          <Progress value={66} className="w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: 3 }}
              >
                🎉
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mt-4">Found {classmates.length} classmates!</h3>
              <p className="text-gray-600">This is about to get viral 🔥</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Class Crew 🔥</h1>
        <p className="text-gray-600 mb-6">Found {classmates.length} classmates with {totalMatches} shared classes</p>

        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{classmates.length}</div>
              <div className="text-xs text-green-700">classmates</div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{totalMatches}</div>
              <div className="text-xs text-purple-700">class matches</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{topClassmate?.matchPercentage || 0}%</div>
              <div className="text-xs text-yellow-700">best match</div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="matches" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Matches</span>
          </TabsTrigger>
          <TabsTrigger value="classes" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>By Class</span>
          </TabsTrigger>
          <TabsTrigger value="viral" className="flex items-center space-x-2">
            <Fire className="h-4 w-4" />
            <span>Going Viral</span>
          </TabsTrigger>
        </TabsList>

        {/* Matches Tab */}
        <TabsContent value="matches" className="space-y-4">
          {classmates.map((classmate, index) => (
            <motion.div
              key={classmate.student.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={classmate.student.profile_pic_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                          {classmate.student.name?.[0] || classmate.student.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full">
                        {classmate.sharedClasses}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {classmate.student.name || classmate.student.username}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {classmate.matchPercentage}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        @{classmate.student.username} • {classmate.lastSeen}
                      </p>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" />
                          <span>{classmate.sharedClasses} classes together</span>
                        </div>
                        <div className="flex space-x-1">
                          {classmate.reactions.map((emoji, i) => (
                            <span key={i} className="text-sm">{emoji}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <Button
                        size="sm"
                        onClick={() => sendDM(classmate)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs"
                      >
                        <MessageCircle className="h-3 w-3 mr-1" />
                        DM
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedClassmate(classmate)}
                        className="text-xs border-gray-200"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>

                  {/* Shared Classes Preview */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Shared Classes:</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {classmate.sharedPeriods.slice(0, 3).map((period) => (
                        <Badge key={period.period} variant="outline" className="text-xs">
                          P{period.period}: {period.subject}
                        </Badge>
                      ))}
                      {classmate.sharedPeriods.length > 3 && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          +{classmate.sharedPeriods.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* By Class Tab */}
        <TabsContent value="classes" className="space-y-4">
          {schedule.periods.map((period, index) => (
            <motion.div
              key={period.period}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Period {period.period}: {period.subject}
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-700">
                      {classmates.filter(c => c.sharedPeriods.some(p => p.period === period.period)).length} classmates
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{period.teacher} • {period.time}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex -space-x-2">
                    {classmates
                      .filter(c => c.sharedPeriods.some(p => p.period === period.period))
                      .slice(0, 5)
                      .map((classmate) => (
                        <Avatar key={classmate.student.id} className="h-8 w-8 border-2 border-white">
                          <AvatarImage src={classmate.student.profile_pic_url || undefined} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-400 to-purple-400 text-white text-xs">
                            {classmate.student.name?.[0] || classmate.student.username[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    {classmates.filter(c => c.sharedPeriods.some(p => p.period === period.period)).length > 5 && (
                      <div className="h-8 w-8 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center">
                        <span className="text-xs text-gray-600">
                          +{classmates.filter(c => c.sharedPeriods.some(p => p.period === period.period)).length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        {/* Viral Tab */}
        <TabsContent value="viral" className="space-y-4">
          <div className="grid gap-4">
            {/* Viral Stats */}
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardContent className="p-6 text-center">
                <Fire className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Going Viral! 🔥</h3>
                <p className="mb-4 opacity-90">Your schedule is spreading across Henry</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">47</div>
                    <div className="text-xs opacity-80">views today</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-xs opacity-80">story shares</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Most Hyped Classes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { subject: 'AP Physics C', teacher: 'Mr. Johnson', hype: 94 },
                  { subject: 'Computer Science A', teacher: 'Ms. Kim', hype: 87 },
                  { subject: 'AP Calculus BC', teacher: 'Ms. Chen', hype: 82 },
                ].map((class_, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>
                    <div className="flex-1">
                      <div className="font-medium">{class_.subject}</div>
                      <div className="text-sm text-gray-600">{class_.teacher}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">{class_.hype}%</div>
                      <div className="text-xs text-gray-500">hype level</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Challenge Cards */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Star className="h-8 w-8 text-yellow-500" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Schedule Twin Challenge</h4>
                    <p className="text-sm text-gray-600">You and Sarah have 4 classes together!</p>
                  </div>
                  <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600">
                    Challenge
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <Button
          onClick={shareProfile}
          variant="outline"
          className="h-12 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share My Schedule
        </Button>
        <Button
          onClick={onStartOver}
          className="h-12 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Add Another
        </Button>
      </div>

      {/* Bottom CTA */}
      <Card className="bg-gradient-to-r from-green-100 to-blue-100 border-green-200">
        <CardContent className="p-6 text-center">
          <h3 className="font-bold text-gray-900 mb-2">Spread the Word! 📢</h3>
          <p className="text-gray-600 mb-4">
            Get your friends to upload their schedules. The more people join, the better the matches!
          </p>
          <Button 
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            onClick={() => {
              const text = encodeURIComponent('Just found my class crew on Henry AI Club! Upload your schedule at henryai.org/schedule 📅🔥')
              window.open(`https://instagram.com/create/story/?text=${text}`, '_blank')
            }}
          >
            <Instagram className="h-4 w-4 mr-2" />
            Share on Stories
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
