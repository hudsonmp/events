import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface SchedulePeriod {
  period: number
  time: string
  subject: string
  teacher: string
  room?: string
  mood?: string
  note?: string
}

interface SaveScheduleRequest {
  student: {
    id: string
    username: string
    name: string | null
    profile_pic_url: string | null
  }
  schedule: {
    periods: SchedulePeriod[]
  }
}

// Helper function to parse teacher name and determine prefix
function parseTeacherInfo(teacherString: string) {
  const cleanTeacher = teacherString.trim()
  
  // Check if it already has a prefix
  const prefixMatch = cleanTeacher.match(/^(Mr|Ms|Mrs|Dr)\.?\s+(.+)/)
  if (prefixMatch) {
    const [, prefix, namesPart] = prefixMatch
    const names = namesPart.trim().split(/\s+/)
    return {
      prefix: prefix as 'Mr' | 'Ms' | 'Mrs' | 'Dr',
      firstName: names[0] || '',
      lastName: names.slice(1).join(' ') || names[0] || ''
    }
  }
  
  // If no prefix, try to determine from name and default to Mr/Ms
  const names = cleanTeacher.split(/\s+/)
  const firstName = names[0] || ''
  const lastName = names.slice(1).join(' ') || names[0] || ''
  
  // Simple heuristic - you might want to make this more sophisticated
  // or ask user during onboarding
  const prefix = 'Mr' // Default to Mr, could be made smarter
  
  return { prefix, firstName, lastName }
}

// Helper function to determine class difficulty
function parseClassDifficulty(className: string): 'regular' | 'advanced' | 'honors' | 'ap' {
  const lowerName = className.toLowerCase()
  if (lowerName.includes('ap ') || lowerName.startsWith('ap')) return 'ap'
  if (lowerName.includes('honors')) return 'honors'
  if (lowerName.includes('advanced')) return 'advanced'
  return 'regular'
}

export async function POST(request: NextRequest) {
  try {
    const { student, schedule }: SaveScheduleRequest = await request.json()

    if (!student || !schedule || !schedule.periods) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // Get the current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Create or update student record if it doesn't exist (for manual entries)
    if (student.username !== 'no-instagram') {
      // Check if student exists, if not create them
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('*')
        .eq('username', student.username)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for existing student:', checkError)
      }

      if (!existingStudent) {
        // Create new student record
        const { error: insertError } = await supabase
          .from('students')
          .insert({
            username: student.username,
            name: student.name,
            profile_pic_url: student.profile_pic_url,
            processed: true
          })

        if (insertError) {
          console.error('Error creating student record:', insertError)
          return NextResponse.json(
            { error: 'Failed to create student record' },
            { status: 500 }
          )
        }
      }
    }

    // Process each period and create/update classes
    const createdClasses = []
    const errors = []

    for (const period of schedule.periods) {
      // Skip non-class periods like lunch
      if (!period.teacher || period.teacher.toLowerCase().includes('lunch') || period.subject.toLowerCase().includes('lunch')) {
        continue
      }

      try {
        // Parse teacher information
        const teacherInfo = parseTeacherInfo(period.teacher)
        const difficulty = parseClassDifficulty(period.subject)

        // Check if this class already exists
        let { data: existingClass, error: classCheckError } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_first_name', teacherInfo.firstName)
          .eq('teacher_last_name', teacherInfo.lastName)
          .eq('period_number', period.period)
          .eq('class_name', period.subject)
          .single()

        if (classCheckError && classCheckError.code !== 'PGRST116') {
          console.error('Error checking for existing class:', classCheckError)
          errors.push(`Failed to check class: ${period.subject}`)
          continue
        }

        let classId: string

        if (!existingClass) {
          // Create new class
          const { data: newClass, error: classInsertError } = await supabase
            .from('classes')
            .insert({
              teacher_first_name: teacherInfo.firstName,
              teacher_last_name: teacherInfo.lastName,
              teacher_prefix: teacherInfo.prefix,
              room_number: period.room || null,
              period_number: period.period,
              class_name: period.subject,
              difficulty: difficulty
            })
            .select()
            .single()

          if (classInsertError || !newClass) {
            console.error('Error creating class:', classInsertError)
            errors.push(`Failed to create class: ${period.subject}`)
            continue
          }

          classId = newClass.id
        } else {
          classId = existingClass.id
        }

        // Link user to this class via classmates table
        const { error: classmateError } = await supabase
          .from('classmates')
          .upsert({
            user_id: user.id,
            class_id: classId,
            reaction: period.mood || null
          }, {
            onConflict: 'user_id,class_id'
          })

        if (classmateError) {
          console.error('Error linking user to class:', classmateError)
          errors.push(`Failed to link to class: ${period.subject}`)
        } else {
          createdClasses.push({
            period: period.period,
            subject: period.subject,
            teacher: period.teacher,
            classId: classId
          })
        }

      } catch (periodError) {
        console.error(`Error processing period ${period.period}:`, periodError)
        errors.push(`Failed to process period ${period.period}: ${period.subject}`)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Schedule saved successfully',
      student: student,
      classesProcessed: createdClasses.length,
      classes: createdClasses,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Save schedule error:', error)
    
    return NextResponse.json(
      { error: 'Failed to save schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
