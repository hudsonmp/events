import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface UserData {
  name?: string
  role?: string
  gradeLevel: string
  classes?: string
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
  problemDescription?: string
  answers?: string[]
  resourceType?: string
  meetingBooked?: boolean
  selectedChallenge?: string
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
    steps: Array<{
      title: string
      minutes: number
      instructions: string
    }>
    assessment: string
    differentiation: Array<{
      type: string
      strategy: string
    }>
  }
  rubric?: {
    criteria: Array<{
      name: string
      levels: Array<{
        level: string
        description: string
      }>
    }>
  }
  quiz?: {
    items: Array<{
      type: string
      prompt: string
      options: string[]
      answer: string
    }>
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
    console.log('Teachers Groq API request body:', JSON.stringify(body, null, 2))
    
    // Step 1: Warm Welcome & Icebreaker
    if (body.systemPrompt && body.systemPrompt.includes("This is your first response")) {
      const prompt = `${body.systemPrompt}

CRITICAL: This is Step 1 of the 6-step teacher onboarding flow. Your response should:
1. Sound human, warm, and empathetic (under 2 short sentences)
2. Briefly introduce what the AI can do without overwhelming
3. Ask about recent challenges in school-specific, relatable terms
4. Keep it conversational and supportive

Example format: "Hey! I'm here to make your day a little easier with AI. What's been the trickiest or most time-consuming part of your day lately?"

Return as plain text message, NOT JSON.`

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are Henry, a friendly AI bot for teachers. Respond with warmth and empathy. Keep responses under 2 sentences and ask about their biggest challenges."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.7,
        max_tokens: 200
      })

      const response = completion.choices[0]?.message?.content
      
      if (!response) {
        throw new Error("No response from AI service")
      }

      const responseData = {
        type: "text",
        message: response.trim(),
        content: response.trim(),
        step: 1
      }
      console.log('Returning response:', JSON.stringify(responseData, null, 2))
      return NextResponse.json(responseData)
    }

    // Handle legacy/simple message requests with messages array
    if (body.messages && !body.systemPrompt && !body.message) {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are Henry, a friendly AI bot for teachers. Respond with warmth and empathy."
          },
          ...body.messages.map(msg => ({
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content
          })),
        ],
        model: "openai/gpt-oss-120b",
        temperature: 0.7,
        max_tokens: 400
      })

      const response = completion.choices[0]?.message?.content
      
      if (!response) {
        throw new Error("No response from AI service")
      }

      return NextResponse.json({
        type: "text",
        content: response.trim(),
        message: response.trim()
      })
    }

    // Handle ongoing conversation with 6-step flow
    if (body.message && body.userData) {
      const contextMessages = body.context || []
      const recentContext = contextMessages.map(msg => `${msg.sender}: ${msg.content}`).join('\n')
      const message = body.message.toLowerCase()
      const currentStep = body.currentStep || 2
      
      console.log('Processing message:', body.message)
      console.log('Current step:', currentStep)
      console.log('User data:', body.userData)

      // Step 2: Conversational Problem Discovery
      if (currentStep === 2) {
        const prompt = `You are Henry, a friendly AI bot helping ${body.userData.name || 'a teacher'}. They just shared a challenge: "${body.message}"

STEP 2 - PROBLEM DISCOVERY: Extract 2-3 distinct challenge areas from their response. For each area:
- Ask a short clarifying question
- Include 1-3 clickable example answer pills to inspire them
- Keep tone conversational and supportive, not diagnostic

Return ONLY this JSON structure:
{
  "type": "problem_discovery",
  "message": "Conversational response acknowledging their challenge",
  "challenge_areas": [
    {
      "area": "Challenge area name",
      "question": "Short clarifying question?",
      "example_pills": ["Quick answer 1", "Quick answer 2", "Quick answer 3"]
    }
  ],
  "step": 2
}`

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are Henry, a friendly AI bot for teachers. Extract challenge areas and ask clarifying questions with example response options."
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.7,
                    max_tokens: 1000
        })

        const response = completion.choices[0]?.message?.content
        
        if (!response) {
          throw new Error("No response from AI service")
        }

        try {
          const parsedResponse = JSON.parse(response.trim())
          return NextResponse.json(parsedResponse)
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError)
          return NextResponse.json({
            type: "text",
            message: response.trim(),
            step: 2
          })
        }
      }

      // Step 3: General Conversation or Deep Dive on Selected Area
      if (currentStep === 3) {
        // Check if this is a general conversation (no specific challenge selected)
        if (!body.selectedChallenge && body.conversationGoal !== 'deep_dive') {
          const contextLength = recentContext.split('\n').length
          
          // Check if user is asking for something to be created directly
          const createKeywords = ['create', 'make', 'generate', 'build', 'write', 'plan', 'design', 'help me with']
          const contentKeywords = ['lesson', 'quiz', 'test', 'rubric', 'assignment', 'activity', 'worksheet', 'email', 'letter']
          const isDirectRequest = createKeywords.some(keyword => message.includes(keyword)) && 
                                 contentKeywords.some(keyword => message.includes(keyword))
          
          let prompt = ''
          
          if (isDirectRequest) {
            // Directly create the requested content
            prompt = `You are Henry, a helpful AI assistant for ${body.userData.name || 'a teacher'} (${body.userData.role || 'teacher'}). 

They requested: "${body.message}"

Create what they asked for immediately. Be specific and practical. If it's a lesson plan, include objectives, materials, steps, and timing. If it's a quiz, include questions and answers. If it's a rubric, include criteria and performance levels. Make it ready to use.

Return ONLY this JSON structure:
{
  "type": "generated_content",
  "message": "Here's what you requested:",
  "generated_content": {
    "title": "Your [Lesson Plan/Quiz/Rubric/etc.]",
    "content": "[The complete, detailed content]",
    "content_type": "lesson_plan"
  },
  "cal_link": "https://cal.com/hudsonmp/henry-ai-club",
  "step": 3
}`
          } else if (contextLength >= 6) {
            // If we've had several exchanges, start generating content instead of just asking questions
            prompt = `You are Henry, a helpful AI assistant for ${body.userData.name || 'a teacher'} (${body.userData.role || 'teacher'}). 

Based on our conversation: ${recentContext}

They just said: "${body.message}"

Instead of asking more questions, provide a helpful, actionable response. If they mentioned any teaching challenge, offer specific solutions, resources, or tools. If they need something created, create it immediately and return it as generated content.

If creating content, return this structure:
{
  "type": "generated_content",
  "message": "Here's what I created for you:",
  "generated_content": {
    "title": "Helpful [Resource/Template/etc.]",
    "content": "[The complete content]",
    "content_type": "general"
  },
  "cal_link": "https://cal.com/hudsonmp/henry-ai-club",
  "step": 3
}

If just providing advice, return:
{
  "type": "text",
  "message": "Your helpful, actionable response with specific solutions",
  "cal_link": "https://cal.com/hudsonmp/henry-ai-club",
  "step": 3
}`
          } else {
            prompt = `You are Henry, a friendly AI bot helping ${body.userData.name || 'a teacher'} (${body.userData.role || 'teacher'}). 

They just said: "${body.message}"

Ask 1-2 specific questions to understand what they need help with, then offer to create something concrete (lesson plan, rubric, quiz, etc.). Be conversational but goal-oriented. Don't just chat - aim to help them create something useful.

Return ONLY this JSON structure:
{
  "type": "text",
  "message": "Your helpful response with specific questions and offers to create content",
  "cal_link": "https://cal.com/hudsonmp/henry-ai-club",
  "step": 3
}`
          }

          const completion = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are Henry, a friendly AI bot for teachers. Respond conversationally and helpfully to whatever they share."
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            model: "openai/gpt-oss-120b",
            temperature: 0.7,
            max_tokens: 400
          })

          const response = completion.choices[0]?.message?.content
          
          if (!response) {
            throw new Error("No response from AI service")
          }

          try {
            const parsedResponse = JSON.parse(response.trim())
            return NextResponse.json(parsedResponse)
          } catch (parseError) {
            console.error("Failed to parse JSON response:", parseError)
            return NextResponse.json({
              type: "text",
              message: response.trim(),
              step: 3
            })
          }
        }

        // Original deep dive logic for when a challenge is selected
        const prompt = `You are Henry helping ${body.userData.name}. They selected: "${body.message}"

STEP 3 - DEEP DIVE: Ask 2-3 targeted questions about their selected challenge area:
- Continue offering example pills for quick replies
- Lightly weave in meeting suggestions ("If we met, I could show you a quick demo of how this solves itself")
- Keep conversational and supportive

Return ONLY this JSON structure:
{
  "type": "deep_dive",
  "message": "Conversational response about their selection",
  "questions": [
    {
      "question": "Targeted question about the challenge?",
      "example_pills": ["Quick answer 1", "Quick answer 2"]
    }
  ],
  "meeting_hint": "Light suggestion about what a meeting could do",
  "step": 3
}`

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system", 
              content: "You are Henry, asking targeted questions to understand their specific challenge better. Include light meeting suggestions."
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.7,
                    max_tokens: 800
        })

        const response = completion.choices[0]?.message?.content
        
        if (!response) {
          throw new Error("No response from AI service")
        }

        try {
          const parsedResponse = JSON.parse(response.trim())
          return NextResponse.json(parsedResponse)
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError)
          return NextResponse.json({
            type: "text",
            message: response.trim(),
            step: 3
          })
        }
      }

      // Step 4: Plan Creation
      if (currentStep === 4 || body.conversationGoal === 'generate_plan') {
        // Detect resource type from conversation context
        const resourceType = 
          message.includes("lesson") || message.includes("plan") || message.includes("activity") ? "lesson plan" :
          message.includes("rubric") || message.includes("grading") || message.includes("assess") ? "rubric" :
          message.includes("quiz") || message.includes("test") ? "quiz" :
          message.includes("email") || message.includes("parent") ? "parent letter" : "resource"

        const prompt = `You are Henry creating a plan for ${body.userData.name}. Based on our conversation: ${recentContext}

STEP 4 - PLAN CREATION: Create a structured plan with:
- Reasoning paragraph explaining why this approach is recommended
- Clear, practical, teacher-relevant bulleted steps
- Resource type identification for next step

Return ONLY this JSON structure:
{
  "type": "plan_creation",
  "plan": {
    "reasoning": "Short explanation of why this approach is recommended for their challenge",
    "steps": ["Clear practical step 1", "Clear practical step 2", "Clear practical step 3"],
    "resource_type": "${resourceType}"
  },
  "step": 4
}`

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are Henry creating practical teaching plans. Focus on clear, actionable steps that address their specific challenge."
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.7,
                    max_tokens: 1200
        })

        const response = completion.choices[0]?.message?.content
        
        if (!response) {
          throw new Error("No response from AI service")
        }

        try {
          const parsedResponse = JSON.parse(response.trim())
          return NextResponse.json(parsedResponse)
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError)
          return NextResponse.json({
            type: "text", 
            message: response.trim(),
            step: 4
          })
        }
      }

      // Step 5: Meeting Nudge Before Resource  
      if (currentStep === 5 || body.conversationGoal === 'meeting_nudge') {
        return NextResponse.json({
          type: "meeting_nudge",
          message: `Schedule a meeting with Hudson to view your ${body.resourceType || 'resource'} 💛`,
          qa_options: {
            pills: ["Why?", "What will we do?"],
            free_text_available: true
          },
          cal_link: "https://cal.com/hudsonmp/henry-ai-club",
          step: 5
        })
      }

      // Handle Q&A about the meeting
      if (body.conversationGoal === 'meeting_qa') {
        const prompt = `You are Henry explaining the meeting to ${body.userData.name}. They asked: "${body.message}"

Provide a helpful, encouraging response about what the meeting with Hudson will involve. Keep it conversational and supportive.

Return ONLY this JSON structure:
{
  "type": "meeting_qa",
  "message": "Helpful explanation about the meeting",
  "step": 5
}`

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are Henry explaining what the meeting with Hudson will be like. Be encouraging and helpful."
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.7,
                    max_tokens: 400
        })

        const response = completion.choices[0]?.message?.content
        
        if (!response) {
          throw new Error("No response from AI service")
        }

        try {
          const parsedResponse = JSON.parse(response.trim())
          return NextResponse.json(parsedResponse)
        } catch (parseError) {
          return NextResponse.json({
            type: "meeting_qa",
            message: response.trim(),
            step: 5
          })
        }
      }

      // Step 6: Final Resource Delivery (only after meeting is booked)
      if ((currentStep === 6 || body.conversationGoal === 'deliver_resource') && body.meetingBooked) {
        const taskType = 
          (body.resourceType || message).includes("lesson") || (body.resourceType || message).includes("plan") ? "lesson_plan" :
          (body.resourceType || message).includes("rubric") || (body.resourceType || message).includes("grading") ? "rubric" :
          (body.resourceType || message).includes("quiz") || (body.resourceType || message).includes("test") ? "quiz" :
          (body.resourceType || message).includes("email") || (body.resourceType || message).includes("parent") ? "email" : "summary"

        const prompt = `Create the final resource for ${body.userData.name} based on our conversation: ${recentContext}

Generate structured content for their ${body.userData.classes || 'classes'} at ${body.userData.gradeLevel || 'high school'} level.

Return ONLY valid JSON:
{
  "type": "final_resource",
  "resource": {
    "title": "Resource title",
    "date": "${new Date().toISOString().split('T')[0]}",
    "author": "Henry AI Club",
    "content": ${taskType === "lesson_plan" ? `{
      "objective": "Clear learning objective",
      "standards": ["relevant standards"],
      "materials": ["required materials"], 
      "duration_minutes": 45,
      "steps": [{"title": "Step name", "minutes": 10, "instructions": "What to do"}],
      "assessment": "Assessment method",
      "differentiation": [{"type": "ELL", "strategy": "strategy"}]
    }` : taskType === "rubric" ? `{
      "criteria": [{"name": "Criterion", "levels": [{"level": "Excellent", "description": "Description"}]}]
    }` : taskType === "quiz" ? `{
      "items": [{"type": "multiple_choice", "prompt": "Question", "options": ["A", "B", "C", "D"], "answer": "A"}]
    }` : taskType === "email" ? `{
      "subject": "Professional email subject",
      "body": "Polished email content"  
    }` : `"Generated content based on their needs"`},
    "footer_note": "Feel free to share this with your colleagues!"
  },
  "step": 6
}`

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are Henry delivering the final teaching resource. Create high-quality, practical content that directly addresses their needs."
            },
            {
              role: "user", 
              content: prompt,
            },
          ],
          model: "openai/gpt-oss-120b",
          temperature: 0.7,
                    max_tokens: 2000
        })

        const response = completion.choices[0]?.message?.content
        
        if (!response) {
          throw new Error("No response from AI service")
        }

        try {
          const parsedResponse = JSON.parse(response.trim())
          return NextResponse.json(parsedResponse)
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError)
          return NextResponse.json({
            type: "text",
            message: response.trim(),
            step: 6
          })
        }
      }

      // Default fallback for ongoing conversation
      return NextResponse.json({
        type: "text",
        message: "I'm here to help! Could you tell me more about what you're looking for?",
        step: currentStep || 2
      })
    }

    // Handle requests with name/userRole but no message (questionnaire responses)
    if (body.name && body.userRole && !body.message) {
      return NextResponse.json({
        type: "text",
        content: "Thank you for the information! How can I help you today?",
        message: "Thank you for the information! How can I help you today?"
      })
    }

    // Handle any other request with basic response
    if (body.messages || body.name || body.userRole) {
      return NextResponse.json({
        type: "text",
        content: "I'm here to help! Could you tell me more about what you need?",
        message: "I'm here to help! Could you tell me more about what you need?"
      })
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
        { error: "AI service rate limit exceeded. Please try again in a moment." },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}