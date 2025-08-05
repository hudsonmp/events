import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface GenerateEventRequest {
  description: string
  additionalInfo?: string
}

interface GroqResponse {
  title: string
  description: string
  tags: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { description, additionalInfo }: GenerateEventRequest = await request.json()

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Event description is required" },
        { status: 400 }
      )
    }

    // Build the prompt for AI generation
    const prompt = `You are an AI assistant helping to create event listings for Patrick Henry High School (PHHS). Based on the description provided, generate a compelling event listing with title, description, and relevant tags.

Event Description: ${description}
${additionalInfo ? `Additional Info: ${additionalInfo}` : ''}

Requirements:
- Create an engaging, professional title suitable for high school students
- Write a detailed description that's informative and appealing to teenagers
- Include relevant tags (3-8 tags) that help categorize the event
- Keep content appropriate for a high school audience
- Make it sound exciting and welcoming

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Event title here",
  "description": "Detailed event description here",
  "tags": ["tag1", "tag2", "tag3"]
}

Do not include any markdown formatting, code blocks, or additional text outside the JSON.`

    // Generate event details with Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct", // Using a reliable and available model for JSON output
      temperature: 0.7,
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content
    
    if (!response) {
      throw new Error("No response from AI service")
    }

    // Clean the response - remove any markdown code blocks or extra formatting
    let cleanedResponse = response.trim()
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '')
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '')
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/\s*```$/, '')
    }

    // Parse the JSON response
    let parsedResponse: GroqResponse
    try {
      parsedResponse = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error("Failed to parse AI response:", cleanedResponse)
      console.error("Parse error:", parseError)
      throw new Error("Invalid JSON response from AI")
    }

    // Validate the response structure
    if (!parsedResponse.title || !parsedResponse.description || !Array.isArray(parsedResponse.tags)) {
      console.error("Invalid response structure:", parsedResponse)
      throw new Error("AI response missing required fields")
    }

    // Clean up tags - ensure they're strings and not too long
    const cleanTags = parsedResponse.tags
      .filter(tag => typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim())
      .slice(0, 8) // Limit to 8 tags max

    return NextResponse.json({
      title: parsedResponse.title.trim(),
      description: parsedResponse.description.trim(),
      tags: cleanTags
    })

  } catch (error: any) {
    console.error("Generate event API error:", error)
    
    // Handle specific Groq errors
    if (error?.status === 400) {
      return NextResponse.json(
        { error: "Invalid request to AI service" },
        { status: 400 }
      )
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      )
    }

    if (error?.status === 401) {
      return NextResponse.json(
        { error: "AI service authentication failed" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Failed to generate event details" },
      { status: 500 }
    )
  }
} 