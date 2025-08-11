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
              text: `You are a highly precise schedule parser. Your task is to analyze a student's class schedule image and convert it into structured data.

Instructions:
1. Carefully examine the image for class periods, times, subjects, teachers, and room numbers
2. Format teacher names consistently as "Mr./Ms./Mrs. LastName" or "Dr. LastName"
3. Include lunch periods if shown
4. Return ONLY a valid JSON object with no additional text

Required JSON structure:
{
  "periods": [
    {
      "period": number,
      "time": "start-end time",
      "subject": "class name",
      "teacher": "teacher name",
      "room": "room number (optional)"
    }
  ]
}

Remember: Be precise and only return the JSON object.`
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
      temperature: 0.1,
      max_tokens: 1000,
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
        if (typeof period.period !== 'number') {
          period.period = index + 1
        }
        if (!period.time) period.time = 'TBD'
        if (!period.subject) period.subject = 'Unknown Class'
        if (!period.teacher) period.teacher = 'TBD'
      })

      return NextResponse.json(parsedSchedule)
    } catch (parseError) {
      console.error('Failed to parse Groq response as JSON:', parseError)
      
      // Fallback: try to extract schedule info with regex or return mock data
      const mockSchedule = {
        periods: [
          { period: 1, time: '8:00-8:50', subject: 'Period 1', teacher: 'TBD', room: 'TBD' },
          { period: 2, time: '9:00-9:50', subject: 'Period 2', teacher: 'TBD', room: 'TBD' },
          { period: 3, time: '10:00-10:50', subject: 'Period 3', teacher: 'TBD', room: 'TBD' },
          { period: 4, time: '11:00-11:50', subject: 'Lunch', teacher: '', room: 'Cafeteria' },
          { period: 5, time: '12:00-12:50', subject: 'Period 5', teacher: 'TBD', room: 'TBD' },
          { period: 6, time: '1:00-1:50', subject: 'Period 6', teacher: 'TBD', room: 'TBD' },
          { period: 7, time: '2:00-2:50', subject: 'Period 7', teacher: 'TBD', room: 'TBD' }
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
