import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { addProfilePicUrl } from '@/lib/instagram-utils'

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
  userId?: string // Use authenticated user ID instead of username
  studentUsername?: string // Keep for backward compatibility
  schedule: {
    periods: SchedulePeriod[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, studentUsername, schedule }: FindClassmatesRequest = await request.json()

    if ((!userId && !studentUsername) || !schedule || !schedule.periods) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Get the current user
    let currentUserId = userId
    if (!currentUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
      currentUserId = user.id
    }

    // Get user's classes from the classmates table
    const { data: userClasses, error: userClassesError } = await supabase
      .from('classmates')
      .select(`
        class_id,
        classes (
          id,
          class_name,
          teacher_first_name,
          teacher_last_name,
          teacher_prefix,
          period_number,
          room_number
        )
      `)
      .eq('user_id', currentUserId)

    if (userClassesError) {
      console.error('Error fetching user classes:', userClassesError)
      return NextResponse.json(
        { error: 'Failed to fetch user classes' },
        { status: 500 }
      )
    }

    if (!userClasses || userClasses.length === 0) {
      return NextResponse.json({
        classmates: [],
        stats: { totalViews: 0, storyShares: 0, totalMatches: 0, totalSharedClasses: 0 },
        success: true,
        message: 'Upload your schedule first to find classmates!'
      })
    }

    const userClassIds = userClasses.map(uc => uc.class_id)

    // Find other students who share classes with the current user
    const { data: classmatesData, error: classmatesError } = await supabase
      .from('classmates')
      .select(`
        user_id,
        class_id,
        reaction,
        users!inner (
          id,
          first_name,
          last_name,
          instagram_username
        ),
        classes!inner (
          id,
          class_name,
          teacher_first_name,
          teacher_last_name,
          teacher_prefix,
          period_number,
          room_number
        )
      `)
      .in('class_id', userClassIds)
      .neq('user_id', currentUserId)

    if (classmatesError) {
      console.error('Error fetching classmates:', classmatesError)
      return NextResponse.json(
        { error: 'Failed to fetch classmates' },
        { status: 500 }
      )
    }

    // Group classmates by user and find their Instagram data if available
    const classmatesMap = new Map()
    
    classmatesData?.forEach((classmate: any) => {
      const userId = classmate.user_id
      if (!classmatesMap.has(userId)) {
        classmatesMap.set(userId, {
          userId: userId,
          user: classmate.users,
          sharedClasses: [],
          instagramData: null
        })
      }
      
      classmatesMap.get(userId).sharedClasses.push({
        classId: classmate.class_id,
        className: classmate.classes.class_name,
        teacher: `${classmate.classes.teacher_prefix} ${classmate.classes.teacher_last_name}`,
        period: classmate.classes.period_number,
        room: classmate.classes.room_number,
        reaction: classmate.reaction
      })
    })

    // Get Instagram data for users who have linked their accounts
    const instagramUsernames = Array.from(classmatesMap.values())
      .map((c: any) => c.user.instagram_username)
      .filter(username => username)

    let studentsMap = new Map()
    if (instagramUsernames.length > 0) {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, username, name')
        .in('username', instagramUsernames)
        .eq('processed', true)

      if (!studentsError && studentsData) {
        studentsData.forEach(student => {
          // Add profile pic URL using the utility function
          const studentWithPic = addProfilePicUrl(student)
          studentsMap.set(student.username, studentWithPic)
        })
      }
    }

    // Build final classmates array with Instagram data
    const realClassmates = Array.from(classmatesMap.values()).map((classmateInfo: any) => {
      const user = classmateInfo.user
      const instagramUsername = user.instagram_username
      const instagramData = instagramUsername ? studentsMap.get(instagramUsername) : null
      
      const sharedClassCount = classmateInfo.sharedClasses.length
      const matchPercentage = Math.floor((sharedClassCount / userClasses.length) * 100)
      
      return {
        student: {
          id: user.id,
          username: instagramData?.username || `${user.first_name}${user.last_name}`.toLowerCase().replace(/\s+/g, ''),
          name: instagramData?.name || `${user.first_name} ${user.last_name}`,
          profile_pic_url: instagramData?.profile_pic_url || null
        },
        sharedClasses: sharedClassCount,
        matchPercentage,
        sharedPeriods: classmateInfo.sharedClasses.map((sc: any) => ({
          period: sc.period,
          subject: sc.className,
          teacher: sc.teacher,
          room: sc.room,
          reaction: sc.reaction
        })),
        reactions: ['🔥', '💬', '👀'].filter(() => Math.random() > 0.3),
        lastSeen: `${Math.floor(Math.random() * 120) + 1}m ago`
      }
    })
    .filter(classmate => classmate.sharedClasses > 0) // Only include if they share classes
    .sort((a, b) => b.sharedClasses - a.sharedClasses) // Sort by most shared classes

    // Add some additional viral stats
    const viralStats = {
      totalViews: Math.floor(Math.random() * 100) + 20,
      storyShares: Math.floor(Math.random() * 20) + 5,
      totalMatches: realClassmates.length,
      totalSharedClasses: realClassmates.reduce((acc: number, c: any) => acc + c.sharedClasses, 0)
    }

    return NextResponse.json({
      classmates: realClassmates,
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
