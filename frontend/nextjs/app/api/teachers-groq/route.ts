import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface UserData {
  name?: string
  helpType?: string
  classes?: string
  gradeLevel: string
}

interface TeachersRequest {
  message?: string
  userData?: UserData
  context?: any[]
  name?: string
  helpType?: string
  classes?: string
  gradeLevel?: string
  taskType?: "lesson_plan" | "rubric" | "quiz" | "email" | "summary"
  prompt?: string
  systemPrompt?: string
  messages?: Array<{ role: string; content: string }>
  currentStep?: number
  conversationGoal?: string
  userRole?: string
  constraints?: {
    duration_minutes?: number
    differentiation?: string[]
    standards?: string[]
  }
}

interface StructuredResponse {
  grade_level: string
  task_type: "lesson_plan" | "rubric" | "quiz" | "email" | "summary"
  lesson_plan?: {
    objective: string
    standards: string[]
    materials: string[]
    duration_minutes: number
    steps: { title: string; minutes: number; instructions: string }[]
    assessment: string
    differentiation: { type: string; strategy: string }[]
  }
  rubric?: {
    criteria: { name: string; levels: { level: string; description: string }[] }[]
  }
  quiz?: {
    items: { type: string; prompt: string; options?: string[]; answer: string }[]
  }
  email?: {
    subject: string
    body: string
  }
  sources: string[]
  notes_for_teacher: string
  confidence: number
  summary: string
  suggested_actions: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: TeachersRequest = await request.json()
    
    // Handle initial setup flow
    if (body.name && body.helpType && body.classes && body.gradeLevel) {
      const userData = {
        name: body.name,
        helpType: body.helpType,
        classes: body.classes,
        gradeLevel: body.gradeLevel
      }
      
      const taskType = userData.helpType === "lesson plan" ? "lesson_plan" : 
                       userData.helpType === "grading" ? "rubric" : "summary"

      const prompt = `You are a teaching copilot. Return concise, school-safe content in structured JSON format. Avoid hallucinated sources; mark unknowns.

Teacher: ${userData.name}
Classes: ${userData.classes}
Grade Level: ${userData.gradeLevel}
Task: ${userData.helpType}

Return ONLY valid JSON with this exact structure:
{
  "grade_level": "${userData.gradeLevel}",
  "task_type": "${taskType}",
  ${taskType === "lesson_plan" ? `"lesson_plan": {
    "objective": "Clear learning objective",
    "standards": ["relevant standards"],
    "materials": ["required materials"],
    "duration_minutes": 45,
    "steps": [{"title": "Step name", "minutes": 10, "instructions": "What to do"}],
    "assessment": "How to assess learning",
    "differentiation": [{"type": "ELL", "strategy": "specific strategy"}]
  },` : ""}
  ${taskType === "rubric" ? `"rubric": {
    "criteria": [{"name": "Criterion", "levels": [{"level": "Excellent", "description": "Description"}]}]
  },` : ""}
  "sources": [],
  "notes_for_teacher": "Important notes or cautions",
  "confidence": 0.9,
  "summary": "One sentence what I created for you",
  "suggested_actions": ["Export", "Differentiate", "Align to Standards"]
}

Generate appropriate content for ${userData.classes} at ${userData.gradeLevel} level.`

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are Henry, an enthusiastic AI assistant from the Henry AI Club! 😉🤖 Be warm, playful, and encouraging. Use emojis naturally. Make teachers feel appreciated and understood. Regularly suggest booking a 15-minute setup with Hudson (a high school sophomore) who can help them get organized live."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.7,
        max_tokens: 10000, // Increased for structured JSON responses
        reasoning_effort: "none", // Disable heavy reasoning to reduce thinking
      })

      console.log("Groq completion (initial):", JSON.stringify(completion, null, 2))
      const response = completion.choices[0]?.message?.content
      console.log("Response content (initial):", response)
      
      if (!response) {
        throw new Error("No response from AI service")
      }

      // Parse JSON response
      try {
        const structuredResponse: StructuredResponse = JSON.parse(response.trim())
        return NextResponse.json({
          type: "structured",
          data: structuredResponse
        })
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError)
        // Fallback to plain text
        return NextResponse.json({
          type: "text",
          message: response.trim()
        })
      }
    }

    // Handle ongoing conversation
    if (body.message && body.userData) {
      const contextMessages = body.context || []
      const recentContext = contextMessages.map(msg => 
        `${msg.sender}: ${msg.content}`
      ).join('\n')

      // Check if this is a quick starter request that needs clarification
      const quickStarters = [
        "Grade these assignments",
        "Create a 5 question math quiz", 
        "Generate an assignment rubric",
        "Brainstorm 1st day activities"
      ]

      const isQuickStarter = body.message && quickStarters.some(starter => 
        body.message!.toLowerCase().includes(starter.toLowerCase())
      )

      if (isQuickStarter) {
        // Return clarification questions instead of structured content
        const clarificationPrompts = {
          "grade these assignments": "What type of assignments are you grading? What subject and grade level? Are you looking for a rubric, grading criteria, or feedback suggestions?",
          "create a 5 question math quiz": "What specific math topic should the quiz cover? What grade level are your students? Should it be multiple choice, short answer, or mixed format?",
          "generate an assignment rubric": "What type of assignment needs a rubric? What are the key skills or criteria you want to assess? How many performance levels do you prefer?",
          "brainstorm 1st day activities": "What grade level and subject do you teach? How long is your class period? Are you looking for icebreakers, introductory activities, or curriculum-related tasks?"
        }

        const matchingPrompt = Object.entries(clarificationPrompts).find(([key]) => 
          body.message!.toLowerCase().includes(key.toLowerCase())
        )?.[1] || "Could you provide more details about what you're looking for? What subject and grade level do you teach?"

        return NextResponse.json({
          type: "text",
          message: matchingPrompt
        })
      }

      // Determine task type from user message
      const message = body.message.toLowerCase()
      const taskType = message.includes("lesson") || message.includes("plan") ? "lesson_plan" :
                       message.includes("rubric") || message.includes("grading") ? "rubric" :
                       message.includes("quiz") || message.includes("test") ? "quiz" :
                       message.includes("email") || message.includes("parent") ? "email" : "summary"

      const prompt = `You are Henry 😉🤖, an enthusiastic AI assistant from the Henry AI Club! You're helping ${body.userData.name || 'a teacher'} who teaches ${body.userData.classes || 'various subjects'} at the ${body.userData.gradeLevel} level. Be warm, encouraging, use emojis naturally, and make them feel appreciated.

IMPORTANT: After providing help, suggest they book a quick 15-minute setup session with Hudson (a high school sophomore from the club) who can help them get organized live. Say something like "want hudson to set this up for you live in 10 minutes? he's great at this!" or "short on time? hudson can walk you through this in 15 minutes!"

Recent conversation: ${recentContext}
Current request: ${body.message}

Return ONLY valid JSON with this exact structure:
{
  "grade_level": "${body.userData.gradeLevel}",
  "task_type": "${taskType}",
  ${taskType === "lesson_plan" ? `"lesson_plan": {
    "objective": "Learning objective based on their request",
    "standards": ["relevant standards"],
    "materials": ["required materials"],
    "duration_minutes": 45,
    "steps": [{"title": "Step name", "minutes": 10, "instructions": "What to do"}],
    "assessment": "Assessment method",
    "differentiation": [{"type": "ELL", "strategy": "strategy"}]
  },` : ""}
  ${taskType === "rubric" ? `"rubric": {
    "criteria": [{"name": "Criterion", "levels": [{"level": "Excellent", "description": "Description"}]}]
  },` : ""}
  ${taskType === "quiz" ? `"quiz": {
    "items": [{"type": "multiple_choice", "prompt": "Question", "options": ["A", "B", "C", "D"], "answer": "A"}]
  },` : ""}
  ${taskType === "email" ? `"email": {
    "subject": "Professional email subject",
    "body": "Polished email content"
  },` : ""}
  "sources": [],
  "notes_for_teacher": "Important notes based on their request",
  "confidence": 0.9,
  "summary": "One sentence what I created based on their request",
  "suggested_actions": ["Export", "Customize", "Copy"]
}

Create content that directly addresses their request for ${body.userData.classes || 'their subject'}.`

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system", 
            content: "You are a helpful AI assistant for teachers. Be warm, encouraging, and provide practical advice."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.7,
        max_tokens: 800, // Increased for structured JSON responses
        reasoning_effort: "none", // Disable heavy reasoning to reduce thinking
      })

      console.log("Groq completion (ongoing):", JSON.stringify(completion, null, 2))
      const response = completion.choices[0]?.message?.content
      console.log("Response content (ongoing):", response)
      
      if (!response) {
        throw new Error("No response from AI service")
      }

      // Parse JSON response
      try {
        const structuredResponse: StructuredResponse = JSON.parse(response.trim())
        return NextResponse.json({
          type: "structured",
          data: structuredResponse
        })
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError)
        // Fallback to plain text
        return NextResponse.json({
          type: "text",
          message: response.trim()
        })
      }
    }

    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    )

  } catch (error: any) {
    console.error("Teachers Groq API error:", error)
    
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
      { error: "Failed to process your request. Please try again." },
      { status: 500 }
    )
  }
}
