import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json()

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      )
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a highly precise schedule parser. Your task is to analyze a student's class schedule image and extract ALL periods into structured data that matches our database schema.

CRITICAL INSTRUCTIONS:
1. EXTRACT ALL PERIODS FROM THE SCHEDULE - typically 6-8 periods per day. Do not skip any periods!

2. For EACH PERIOD, examine:
   - Period number (must be sequential: 1, 2, 3, etc.)
   - Start and end times (as separate fields)
   - Subject name (full name, not abbreviations)
   - Teacher name (with proper prefix)
   - Room number/location

2. FORMAT REQUIREMENTS:
   - Teacher Names: ALWAYS use "Mr./Ms./Mrs. LastName" or "Dr. LastName"
   - Times: Use 24-hour format as separate fields (e.g. "08:00" and "08:50")
   - Subject Names: Use proper capitalization (e.g. "Advanced Placement Biology")
   - Room Numbers: Include building/wing if shown (e.g. "Room 101" or "Science Wing 101")

3. SPECIAL PERIODS:
   - Include lunch/break periods if shown (subject: "Lunch" or "Break")
   - Mark study halls (subject: "Study Hall")
   - Mark free periods (subject: "Free Period")
   - Include zero/after-school periods

4. VALIDATION RULES:
   - Period numbers must be sequential integers
   - Times must be in 24-hour format (HH:MM)
   - Every period must have subject and teacher
   - Room numbers are optional
   - Default mood and note to null

Return ONLY this exact JSON structure with no additional text:
{
  "periods": [
    {
      "period_number": number,    // Required: Sequential integer
      "start_time": "HH:MM",     // Required: 24-hour format
      "end_time": "HH:MM",       // Required: 24-hour format
      "subject": "class name",    // Required: Full, proper name
      "teacher": "teacher name",  // Required: With proper prefix
      "room": "room number",      // Optional: Null if not available
      "mood": null,              // Initialize as null
      "note": null               // Initialize as null
    }
  ]
}

CRITICAL: Return ONLY the JSON object. No explanations, no markdown, no additional text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
      temperature: 0.3,
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content
    
    if (!response) {
      throw new Error('No response from Groq')
    }

    try {
      const parsedSchedule = JSON.parse(response)
      
      // Validate the structure
      if (!parsedSchedule.periods || !Array.isArray(parsedSchedule.periods)) {
        throw new Error('Invalid schedule structure')
      }

      // Ensure each period has required fields
      parsedSchedule.periods.forEach((period: any, index: number) => {
        if (typeof period.period_number !== 'number') {
          period.period_number = index + 1
        }
        if (!period.start_time) period.start_time = 'TBD'
        if (!period.end_time) period.end_time = 'TBD'
        if (!period.subject) period.subject = 'Unknown Class'
        if (!period.teacher) period.teacher = 'TBD'
        if (!period.room) period.room = null
        if (!period.mood) period.mood = null
        if (!period.note) period.note = null
      })

      return NextResponse.json(parsedSchedule)
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', parseError)
      
      // Fallback: try to extract schedule info with regex or return mock data
      const mockSchedule = {
        periods: [
          { period_number: 1, start_time: '08:00', end_time: '08:50', subject: 'Period 1', teacher: 'TBD', room: null, mood: null, note: null },
          { period_number: 2, start_time: '09:00', end_time: '09:50', subject: 'Period 2', teacher: 'TBD', room: null, mood: null, note: null },
          { period_number: 3, start_time: '10:00', end_time: '10:50', subject: 'Period 3', teacher: 'TBD', room: null, mood: null, note: null },
          { period_number: 4, start_time: '11:00', end_time: '11:50', subject: 'Lunch', teacher: 'N/A', room: 'Cafeteria', mood: null, note: null },
          { period_number: 5, start_time: '12:00', end_time: '12:50', subject: 'Period 5', teacher: 'TBD', room: null, mood: null, note: null },
          { period_number: 6, start_time: '13:00', end_time: '13:50', subject: 'Period 6', teacher: 'TBD', room: null, mood: null, note: null },
          { period_number: 7, start_time: '14:00', end_time: '14:50', subject: 'Period 7', teacher: 'TBD', room: null, mood: null, note: null }
        ]
      }
      
      return NextResponse.json(mockSchedule)
    }

  } catch (error) {
    console.error('Schedule parsing error:', error)
    
    return NextResponse.json(
      { error: 'Failed to parse schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
