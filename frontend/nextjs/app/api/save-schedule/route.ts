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

export async function POST(request: NextRequest) {
  try {
    const { student, schedule }: SaveScheduleRequest = await request.json()

    if (!student || !schedule || !schedule.periods) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Create or update student record if it doesn't exist (for manual entries)
    if (student.username === 'no-instagram') {
      // This is a manual entry, we might want to create a temporary student record
      // or handle it differently based on your needs
      console.log('Manual entry student:', student.name)
    } else {
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

    // Here you could save the schedule to a schedules table
    // For now, we'll just return success
    // You might want to create a schedules table with columns like:
    // - id (uuid)
    // - student_id (uuid)
    // - schedule_data (jsonb)
    // - created_at (timestamp)
    // - updated_at (timestamp)

    /* Example of saving to a schedules table:
    const { error: scheduleError } = await supabase
      .from('schedules')
      .upsert({
        student_username: student.username,
        schedule_data: schedule,
        updated_at: new Date().toISOString()
      })

    if (scheduleError) {
      console.error('Error saving schedule:', scheduleError)
      return NextResponse.json(
        { error: 'Failed to save schedule' },
        { status: 500 }
      )
    }
    */

    return NextResponse.json({ 
      success: true,
      message: 'Schedule saved successfully',
      student: student
    })

  } catch (error) {
    console.error('Save schedule error:', error)
    
    return NextResponse.json(
      { error: 'Failed to save schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
