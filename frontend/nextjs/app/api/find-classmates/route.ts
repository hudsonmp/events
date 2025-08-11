import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SchedulePeriod {
  period: number
  time: string
  subject: string
  teacher: string
  room?: string
  mood?: string
  note?: string
}

interface FindClassmatesRequest {
  studentUsername: string
  schedule: {
    periods: SchedulePeriod[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { studentUsername, schedule }: FindClassmatesRequest = await request.json()

    if (!studentUsername || !schedule || !schedule.periods) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get other students (excluding the current user)
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .neq('username', studentUsername)
      .eq('processed', true)
      .limit(20)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    // Since we don't have a schedules table yet, we'll return mock matches
    // In a real implementation, you would:
    // 1. Fetch schedules for all students
    // 2. Compare class names, teachers, and times
    // 3. Calculate match percentages based on shared classes
    
    const mockClassmates = students?.slice(0, 8).map((student, index) => {
      // Simulate shared classes by randomly selecting from user's schedule
      const sharedCount = Math.floor(Math.random() * Math.min(5, schedule.periods.length)) + 1
      const sharedPeriods = schedule.periods.slice(0, sharedCount)
      const matchPercentage = Math.floor((sharedCount / schedule.periods.length) * 100)
      
      return {
        student: {
          id: student.id,
          username: student.username,
          name: student.name,
          profile_pic_url: student.profile_pic_url
        },
        sharedClasses: sharedCount,
        matchPercentage,
        sharedPeriods,
        reactions: ['🔥', '💬', '👀'].filter(() => Math.random() > 0.5),
        lastSeen: `${Math.floor(Math.random() * 60) + 1}m ago`
      }
    }).sort((a, b) => b.sharedClasses - a.sharedClasses) || []

    // Add some additional viral stats
    const viralStats = {
      totalViews: Math.floor(Math.random() * 100) + 20,
      storyShares: Math.floor(Math.random() * 20) + 5,
      totalMatches: mockClassmates.length,
      totalSharedClasses: mockClassmates.reduce((acc, c) => acc + c.sharedClasses, 0)
    }

    return NextResponse.json({
      classmates: mockClassmates,
      stats: viralStats,
      success: true
    })

  } catch (error) {
    console.error('Find classmates error:', error)
    
    return NextResponse.json(
      { error: 'Failed to find classmates', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
