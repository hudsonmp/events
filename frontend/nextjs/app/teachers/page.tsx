"use client"

import { useState, useEffect, useRef } from "react"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Clock, X } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { ArtifactCards } from "@/components/artifact-cards"
import PreChatSimulation from "@/components/pre-chat-simulation"
import FinalPlanCard from "@/components/final-plan-card"
import MeetingBooking from "@/components/meeting-booking"
import PlanComponent from "@/components/plan-component"
import MeetingNudge from "@/components/meeting-nudge"
import ResourceContainer from "@/components/resource-container"
import { analytics } from "@/lib/analytics"
import { ChevronRight, ChevronLeft } from "lucide-react"
import GeneratedContentCard from "@/components/generated-content-card"

interface Message {
  id: string
  content: string
  sender: "ai" | "user"
  timestamp: Date
  type?: "text" | "bubbles" | "input-embedded" | "structured" | "embedded-input" | "final-plan" | "multi-question" | 
         "problem_discovery" | "deep_dive" | "plan_creation" | "meeting_nudge" | "meeting_qa" | "final_resource" | "generated_content"
  bubbles?: string[]
  inputPrompt?: string
  inputValue?: string
  name?: string
  structuredData?: any
  embeddedInput?: {
    placeholder: string
    field: string
  }
  finalPlan?: {
    title: string
    description: string
    timeSaved: number
    details?: any
  }
  questions?: string[]
  currentQuestionIndex?: number
  answers?: string[]
  // New fields for 6-step flow
  step?: number
  challenge_areas?: Array<{
    area: string
    question: string
    example_pills: string[]
  }>
  plan?: {
    reasoning: string
    steps: string[]
    resource_type: string
  }
  qa_options?: {
    pills: string[]
    free_text_available: boolean
  }
  cal_link?: string
  meeting_hint?: string
  resource?: {
    title: string
    date: string
    author: string
    content: any
    footer_note: string
  }
  resourceType?: string
  // New fields for generated content
  generated_content?: {
    title: string
    content: string
    content_type: string
  }
}

interface UserData {
  name?: string
  helpType?: string
  classes?: string
  gradeLevel: string
  role?: string
  problemDescription?: string
}

interface MultiQuestionComponentProps {
  questions: string[]
  currentIndex: number
  answers: string[]
  onAnswerSubmit: (index: number, answer: string) => void
}

const MultiQuestionComponent: React.FC<MultiQuestionComponentProps> = ({ 
  questions, 
  currentIndex, 
  answers, 
  onAnswerSubmit 
}) => {
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [displayIndex, setDisplayIndex] = useState(0)

  useEffect(() => {
    setDisplayIndex(Math.min(currentIndex, questions.length - 1))
  }, [currentIndex, questions.length])

  const handleSubmit = () => {
    if (currentAnswer.trim()) {
      onAnswerSubmit(displayIndex, currentAnswer.trim())
      setCurrentAnswer("")
      if (displayIndex < questions.length - 1) {
        setDisplayIndex(displayIndex + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (displayIndex > 0) {
      setDisplayIndex(displayIndex - 1)
      setCurrentAnswer(answers[displayIndex - 1] || "")
    }
  }

  const handleNext = () => {
    if (displayIndex < questions.length - 1) {
      setDisplayIndex(displayIndex + 1)
      setCurrentAnswer(answers[displayIndex + 1] || "")
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 max-w-[95%] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">
          Question {displayIndex + 1} of {questions.length}
        </span>
        <div className="flex space-x-1">
          {questions.map((_, index) => (
            <div 
              key={index}
              className={`w-2 h-2 rounded-full ${
                index <= displayIndex ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      <h3 className="font-medium text-gray-900 mb-3">{questions[displayIndex]}</h3>

      <div className="flex space-x-2 items-center">
        <Input
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSubmit()
            }
          }}
          placeholder="Type your answer..."
          className="flex-1 rounded-full"
        />
        
        <div className="flex space-x-1">
          {displayIndex > 0 && (
            <Button
              onClick={handlePrevious}
              size="sm"
              variant="outline"
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            onClick={displayIndex < questions.length - 1 ? handleNext : handleSubmit}
            disabled={!currentAnswer.trim() && displayIndex >= answers.length}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
          >
            {displayIndex < questions.length - 1 ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {answers[displayIndex] && (
        <div className="mt-2 text-sm text-gray-600">
          Previous answer: {answers[displayIndex]}
        </div>
      )}
    </div>
  )
}

export default function TeachersPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentInput, setCurrentInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<UserData>({ gradeLevel: "high school" })
  const [currentStep, setCurrentStep] = useState(0)
  const [timeSaved, setTimeSaved] = useState(0)
  const [showCTA, setShowCTA] = useState(false)
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false)
  const [fullScreenMessage, setFullScreenMessage] = useState<Message | null>(null)
  const [showPreChat, setShowPreChat] = useState(true)
  const [preChatStep, setPreChatStep] = useState(0)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [showProgress, setShowProgress] = useState(false)
  const [progressStep, setProgressStep] = useState(1)
  const [finalPlan, setFinalPlan] = useState<any>(null)
  const [showMeetingBooking, setShowMeetingBooking] = useState(false)
  const [changeRequestInput, setChangeRequestInput] = useState('')
  const [currentProblem, setCurrentProblem] = useState<string>("")
  // New state variables for 6-step flow
  const [conversationStep, setConversationStep] = useState(1)
  const [meetingBooked, setMeetingBooked] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState('')
  const [currentResourceType, setCurrentResourceType] = useState('')
  const [showTypeAnimation, setShowTypeAnimation] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const [isLocalhost, setIsLocalhost] = useState(false)

  // Load confetti script
  useEffect(() => {
    // detect localhost
    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
        setIsLocalhost(true)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
    script.async = true
    document.body.appendChild(script)
    
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("teachers-chat-history")
    const savedUserData = localStorage.getItem("teachers-user-data")
    const savedStep = localStorage.getItem("teachers-current-step")
    const savedHasUserSent = localStorage.getItem("teachers-has-user-sent")
    const savedPreChatComplete = localStorage.getItem("teachers-prechat-complete")
    const host = window.location.hostname
    const onLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1'
    
    // Localhost behavior: if pre-chat completed once, always start fresh main chat
    if (onLocalhost && savedPreChatComplete === 'true') {
      // clear chat-related storage but keep the prechat flag so we keep skipping
      localStorage.removeItem('teachers-chat-history')
      localStorage.removeItem('teachers-user-data')
      localStorage.removeItem('teachers-current-step')
      localStorage.removeItem('teachers-has-user-sent')

      // reset in-memory state and start main chat defaults
      setMessages([])
      setUserData({ gradeLevel: 'high school' })
      setHasUserSentMessage(false)
      setCurrentStep(0)
      setShowPreChat(false)
      loadDefaultMessages()
      return
    }

    // Check if pre-chat has been completed (non-localhost behavior)
    if (savedPreChatComplete === 'true') {
      setShowPreChat(false)
      
      // Load saved data when pre-chat is complete
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages))
        const parsedMessages = JSON.parse(savedMessages)
        const hasUserMessages = parsedMessages.some((msg: Message) => msg.sender === 'user')
        setHasUserSentMessage(hasUserMessages)
      } else {
        // If pre-chat complete but no messages, load defaults
        loadDefaultMessages()
      }
      
      if (savedUserData) {
        const data = JSON.parse(savedUserData)
        setUserData(data)
        if (data.name) setUserName(data.name)
      }
      
      if (savedStep) {
        setCurrentStep(parseInt(savedStep))
      }
      
      if (savedHasUserSent) {
        setHasUserSentMessage(JSON.parse(savedHasUserSent))
      }
    } else {
      // First time or after reset - show pre-chat
      setShowPreChat(true)
      analytics.trackPreChatView()
    }
  }, [])

  // Save to localStorage whenever messages or userData change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("teachers-chat-history", JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    localStorage.setItem("teachers-user-data", JSON.stringify(userData))
  }, [userData])

  useEffect(() => {
    localStorage.setItem("teachers-current-step", currentStep.toString())
  }, [currentStep])

  useEffect(() => {
    localStorage.setItem("teachers-has-user-sent", JSON.stringify(hasUserSentMessage))
  }, [hasUserSentMessage])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadDefaultMessages = async () => {
    setShowProgress(true)
    
    const defaultMessages = [
      {
        id: "1",
        content: "hey, i'm henry 😉🤖, the assistant for our campus ai club!",
        sender: "ai" as const,
        timestamp: new Date(),
        type: "text" as const
      },
      {
        id: "2", 
        content: "teachers have saved an average of ~6.2 hours/week with our tool. you next? (ps it's free)",
        sender: "ai" as const,
        timestamp: new Date(),
        type: "text" as const
      },
      {
        id: "3",
        content: "don't worry if you don't know where to start; that's what i'm here for 😁!",
        sender: "ai" as const,
        timestamp: new Date(),
        type: "text" as const
      },
      {
        id: "4",
        content: "what's your name?",
        sender: "ai" as const,
        timestamp: new Date(),
        type: "embedded-input" as const,
        embeddedInput: {
          placeholder: "Enter your name",
          field: "name"
        }
      }
    ]

    // Add first message immediately
    setMessages([defaultMessages[0]])
    
    // Add remaining messages with 1 second delays
    for (let i = 1; i < defaultMessages.length; i++) {
      setTimeout(() => {
        setMessages(prev => [...prev, defaultMessages[i]])
        if (i === defaultMessages.length - 1) {
          setCurrentStep(1)
        }
      }, i * 1000) // 1 second delays
    }
  }

  const handleBubbleClick = async (bubble: string) => {
    // Add user selection
    const userMessage: Message = {
      id: Date.now().toString(),
      content: bubble,
      sender: "user",
      timestamp: new Date(),
      type: "text"
    }
    setMessages(prev => [...prev, userMessage])
    
    if (currentStep === 3) {
      // Pain point response
      if (bubble === "Yes!") {
        // Show input for explaining the problem
        const problemInputMessage: Message = {
          id: `problem-input-${Date.now()}`,
          content: "what's the problem you're dealing with?",
          sender: "ai",
          timestamp: new Date(),
          type: "embedded-input",
          embeddedInput: {
            placeholder: "e.g., grading takes forever, lesson planning is overwhelming...",
            field: "problemDescription"
          }
        }
        setMessages(prev => [...prev, problemInputMessage])
        setCurrentStep(3.5) // Intermediate step for problem description
        return
      } else if (bubble === "Not really") {
        // Skip to final generation options
        setTimeout(() => {
          const generateMessage: Message = {
            id: `generate-${Date.now()}`,
            content: "got it! what would you like me to help you generate?",
            sender: "ai",
            timestamp: new Date(),
            type: "bubbles",
            bubbles: getUserRoleOptions(userRole)
          }
          setMessages(prev => [...prev, generateMessage])
          setCurrentStep(5) // Skip questionnaire, go to final selection
        }, 500)
        return
      }
    } else if (currentStep === 2) {
      // Role selection
      if (bubble === "other") {
        // Show custom input for "other" role
        const customRoleMessage: Message = {
          id: `custom-role-${Date.now()}`,
          content: "what's your role?",
          sender: "ai",
          timestamp: new Date(),
          type: "embedded-input",
          embeddedInput: {
            placeholder: "e.g., librarian, coach, principal...",
            field: "customRole"
          }
        }
        setMessages(prev => [...prev, customRoleMessage])
        setCurrentStep(2.5) // Intermediate step for custom role
        return
      }
      
      setUserRole(bubble)
      setUserData(prev => ({ ...prev, role: bubble }))
      analytics.trackRoleSelected(bubble)
      
      // Call Groq with role information
      setTimeout(async () => {
        const userData = {
          name: userName,
          role: bubble,
          gradeLevel: "high school"
        }
        
        setIsLoading(true)
        try {
          const response = await fetch('/api/teachers-groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{
                role: 'user',
                content: `My name is ${userName} and I'm a ${bubble}`
              }],
              name: userName,
              userRole: bubble,
              systemPrompt: `You are the personality and conversation engine for Henry AI Club's teacher onboarding experience, named Henry, our friendly AI bot. Your highest priority is to start by engaging in a natural, back-and-forth conversation before producing any structured or final output — no "jumping to the answer." Your job is to feel like a friendly colleague catching up with the user, not an instant form-filler.

The user is a ${bubble} named ${userName}. This is your first response after they've introduced themselves and their role. Respond with a warm, engaging message that acknowledges their role and asks what they find most challenging or time-consuming about their work. Be conversational, use emojis naturally, and make them feel seen and valued. Keep it to 1-2 sentences max.`
            })
          })
          
          if (!response.ok) {
            console.error('API response not ok:', response.status, response.statusText)
            throw new Error(`API request failed: ${response.status} ${response.statusText}`)
          }
          const result = await response.json()
          
          // Add thank you message first
          const thankYouMessage: Message = {
            id: `thanks-${Date.now()}`,
            content: `cool, thanks ${userName}!`,
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, thankYouMessage])
          
          // Then add Groq response
          setTimeout(() => {
            const groqResponse: Message = {
              id: Date.now().toString(),
              content: result.content || result.message,
              sender: "ai",
              timestamp: new Date(),
              type: "text"
            }
            setMessages(prev => [...prev, groqResponse])
            
            // After another delay, enable chat
            setTimeout(() => {
              const chatMessage: Message = {
                id: `chat-${Date.now()}`,
                content: "What would you like help with today? Just type your message below! 💬",
                sender: "ai",
                timestamp: new Date(),
                type: "text"
              }
              setMessages(prev => [...prev, chatMessage])
              setCurrentStep(3)
              setConversationStep(3)
              setProgressStep(3)
              setHasUserSentMessage(true)
            }, 1000)
          }, 1000)
          
        } catch (error) {
          console.error('Error:', error)
          toast.error('Failed to get response')
          
          // Fallback to default message
          const thankYouMessage: Message = {
            id: `thanks-${Date.now()}`,
            content: `cool, thanks ${userName}!`,
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, thankYouMessage])
          
          setTimeout(() => {
            const chatMessage: Message = {
              id: `chat-${Date.now()}`,
              content: "What would you like help with today? Just type your message below! 💬",
              sender: "ai",
              timestamp: new Date(),
              type: "text"
            }
            setMessages(prev => [...prev, chatMessage])
            setCurrentStep(3)
            setProgressStep(3)
            setHasUserSentMessage(true)
          }, 1000)
        } finally {
          setIsLoading(false)
        }
      }, 500)
    } else {
      // Original behavior for initial selection
      setUserData(prev => ({ ...prev, helpType: bubble }))
      
      // Add follow-up message after delay
      setTimeout(() => {
        const followUpMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "what's your name?\ni know you're busy, so how can i help you get set up for the year?",
          sender: "ai",
          timestamp: new Date(),
          type: "input-embedded",
          inputPrompt: "Type your name here..."
        }
        setMessages(prev => [...prev, followUpMessage])
        setCurrentStep(1)
      }, 500)
    }
  }

  const handleEmbeddedInput = (messageId: string, value: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, inputValue: value } : msg
    ))
  }

  const handleEmbeddedSubmit = async (messageId: string, value: string) => {
    if (!value.trim()) return

    // Find the message to get the field type
    const message = messages.find(msg => msg.id === messageId)
    const field = message?.embeddedInput?.field

    // Handle field-based submissions
    if (field === "problemDescription") {
      // Problem description input (can happen from any Groq output)
      setUserData(prev => ({ ...prev, problemDescription: value }))
      
      // Add user's response
      const userResponse: Message = {
        id: `user-${Date.now()}`,
        content: value,
        sender: "user",
        timestamp: new Date(),
        type: "text"
      }
      setMessages(prev => [...prev, userResponse])

      // Call Groq to generate follow-up questions
      setIsLoading(true)
      try {
        const response = await fetch('/api/teachers-groq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `I'm having this problem: ${value}`
            }],
            name: userName,
            userRole: userRole,
            problemDescription: value,
            systemPrompt: `You are Henry, the friendly AI assistant. The user (${userName}, a ${userRole}) has described a problem: "${value}". Generate 1-3 short, specific follow-up questions to better understand their situation. Each question should be one sentence and help you create a targeted solution. Return ONLY a JSON array of strings, like: ["What grade level?", "How many students?", "What subject?"]`
          })
        })

        if (!response.ok) {
          console.error('API response not ok:', response.status, response.statusText)
          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        }
        const result = await response.json()

        // Add "i have a few questions" message
        setTimeout(() => {
          const questionsIntroMessage: Message = {
            id: `questions-intro-${Date.now()}`,
            content: "i have a few questions to help me understand better",
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, questionsIntroMessage])

          // Parse the questions from Groq response
          let questions: string[] = []
          try {
            questions = JSON.parse(result.content || result.message || '[]')
          } catch {
            questions = ["What subject area?", "What grade level?", "How many students?"]
          }

          setTimeout(() => {
            const multiQuestionMessage: Message = {
              id: `multi-questions-${Date.now()}`,
              content: "questions",
              sender: "ai",
              timestamp: new Date(),
              type: "multi-question",
              questions: questions,
              currentQuestionIndex: 0,
              answers: []
            }
            setMessages(prev => [...prev, multiQuestionMessage])
            setCurrentStep(4) // Move to questionnaire step
          }, 500)
        }, 500)

      } catch (error) {
        console.error('Error:', error)
        toast.error('Failed to generate questions')
        // Fallback questions
        setTimeout(() => {
          const questionsIntroMessage: Message = {
            id: `questions-intro-${Date.now()}`,
            content: "i have a few questions to help me understand better",
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, questionsIntroMessage])

          setTimeout(() => {
            const multiQuestionMessage: Message = {
              id: `multi-questions-${Date.now()}`,
              content: "questions",
              sender: "ai",
              timestamp: new Date(),
              type: "multi-question",
              questions: ["What subject area?", "What grade level?", "How many students?"],
              currentQuestionIndex: 0,
              answers: []
            }
            setMessages(prev => [...prev, multiQuestionMessage])
            setCurrentStep(4)
          }, 500)
        }, 500)
      } finally {
        setIsLoading(false)
      }
      return
    }

    if (field === "customRole") {
      // Custom role input
      setUserRole(value)
      setUserData(prev => ({ ...prev, role: value }))
      analytics.trackRoleSelected(`other: ${value}`)
      
      // Add user's response
      const userResponse: Message = {
        id: `user-${Date.now()}`,
        content: value,
        sender: "user",
        timestamp: new Date(),
        type: "text"
      }
      setMessages(prev => [...prev, userResponse])
      
      // Continue with Groq call like in bubble selection
      setTimeout(async () => {
        const userData = {
          name: userName,
          role: value,
          gradeLevel: "high school"
        }
        
        setIsLoading(true)
        try {
          const response = await fetch('/api/teachers-groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{
                role: 'user',
                content: `My name is ${userName} and I'm a ${value}`
              }],
              name: userName,
              userRole: value,
              systemPrompt: `You are the personality and conversation engine for Henry AI Club's teacher onboarding experience, named Henry, our friendly AI bot. Your highest priority is to start by engaging in a natural, back-and-forth conversation before producing any structured or final output — no "jumping to the answer." Your job is to feel like a friendly colleague catching up with the user, not an instant form-filler.

The user is a ${value} named ${userName}. This is your first response after they've introduced themselves and their role. Respond with a warm, engaging message that acknowledges their role and asks what they find most challenging or time-consuming about their work. Be conversational, use emojis naturally, and make them feel seen and valued. Keep it to 1-2 sentences max.`
            })
          })
          
          if (!response.ok) {
            console.error('API response not ok:', response.status, response.statusText)
            throw new Error(`API request failed: ${response.status} ${response.statusText}`)
          }
          const result = await response.json()
          
          // Add thank you message first
          const thankYouMessage: Message = {
            id: `thanks-${Date.now()}`,
            content: `cool, thanks ${userName}!`,
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, thankYouMessage])
          
          // Then add Groq response
          setTimeout(() => {
            const groqResponse: Message = {
              id: Date.now().toString(),
              content: result.content || result.message,
              sender: "ai",
              timestamp: new Date(),
              type: "text"
            }
            setMessages(prev => [...prev, groqResponse])
            
            // After another delay, enable chat
            setTimeout(() => {
              const chatMessage: Message = {
                id: `chat-${Date.now()}`,
                content: "What would you like help with today? Just type your message below! 💬",
                sender: "ai",
                timestamp: new Date(),
                type: "text"
              }
              setMessages(prev => [...prev, chatMessage])
              setCurrentStep(3)
              setConversationStep(3)
              setProgressStep(3)
              setHasUserSentMessage(true)
            }, 1000)
          }, 1000)
          
        } catch (error) {
          console.error('Error:', error)
          toast.error('Failed to get response')
          
          // Fallback to default message
          const thankYouMessage: Message = {
            id: `thanks-${Date.now()}`,
            content: `cool, thanks ${userName}!`,
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, thankYouMessage])
          
          setTimeout(() => {
            const chatMessage: Message = {
              id: `chat-${Date.now()}`,
              content: "What would you like help with today? Just type your message below! 💬",
              sender: "ai",
              timestamp: new Date(),
              type: "text"
            }
            setMessages(prev => [...prev, chatMessage])
            setCurrentStep(3)
            setProgressStep(3)
            setHasUserSentMessage(true)
          }, 1000)
        } finally {
          setIsLoading(false)
        }
      }, 500)
      return
    }

    // Handle step-based submissions (legacy/fallback)
    if (currentStep === 1) {
      // Name input
      setUserName(value)
      setUserData(prev => ({ ...prev, name: value }))
      analytics.trackNameSubmitted(value)
      
      // Add user's response
      const userResponse: Message = {
        id: `user-${Date.now()}`,
        content: value,
        sender: "user",
        timestamp: new Date(),
        type: "text"
      }
      setMessages(prev => [...prev, userResponse])
      
      // Add simple default response without Groq
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: `hi ${value}, how are you? 😊`,
          sender: "ai",
          timestamp: new Date(),
          type: "text"
        }
        setMessages(prev => [...prev, aiResponse])
        
        // After another delay, add role selection
        setTimeout(() => {
          const roleMessage: Message = {
            id: `role-${Date.now()}`,
            content: "are you a...",
            sender: "ai",
            timestamp: new Date(),
            type: "bubbles",
            bubbles: ["teacher", "counselor", "admin", "other"]
          }
          setMessages(prev => [...prev, roleMessage])
          setCurrentStep(2)
          setProgressStep(2)
        }, 1500)
      }, 500)
    } else if (currentStep === 2.5) {
      // Custom role input
      setUserRole(value)
      setUserData(prev => ({ ...prev, role: value }))
      analytics.trackRoleSelected(`other: ${value}`)
      
      // Add user's response
      const userResponse: Message = {
        id: `user-${Date.now()}`,
        content: value,
        sender: "user",
        timestamp: new Date(),
        type: "text"
      }
      setMessages(prev => [...prev, userResponse])
      
      // Call Groq with custom role information
      setTimeout(async () => {
        setIsLoading(true)
        try {
          const response = await fetch('/api/teachers-groq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{
                role: 'user',
                content: `My name is ${userName} and I'm a ${value}`
              }],
              name: userName,
              userRole: value,
              systemPrompt: `You are the personality and conversation engine for Henry AI Club's teacher onboarding experience, named Henry, our friendly AI bot. Your highest priority is to start by engaging in a natural, back-and-forth conversation before producing any structured or final output — no "jumping to the answer." Your job is to feel like a friendly colleague catching up with the user, not an instant form-filler.

The user is a ${value} named ${userName}. This is your first response after they've introduced themselves and their role. Respond with a warm, engaging message that acknowledges their role and asks what they find most challenging or time-consuming about their work. Be conversational, use emojis naturally, and make them feel seen and valued. Keep it to 1-2 sentences max.`
            })
          })
          
          if (!response.ok) {
            console.error('API response not ok:', response.status, response.statusText)
            throw new Error(`API request failed: ${response.status} ${response.statusText}`)
          }
          const result = await response.json()
          
          // Add thank you message first
          const thankYouMessage: Message = {
            id: `thanks-${Date.now()}`,
            content: `cool, thanks ${userName}!`,
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, thankYouMessage])
          
          // Then add Groq response
          setTimeout(() => {
            const groqResponse: Message = {
              id: Date.now().toString(),
              content: result.content || result.message,
              sender: "ai",
              timestamp: new Date(),
              type: "text"
            }
            setMessages(prev => [...prev, groqResponse])
            setCurrentStep(3)
            setProgressStep(3)
            setHasUserSentMessage(true)
          }, 1000)
          
        } catch (error) {
          console.error('Error:', error)
          toast.error('Failed to get response')
          
          // Fallback to default message
          const thankYouMessage: Message = {
            id: `thanks-${Date.now()}`,
            content: `cool, thanks ${userName}!`,
            sender: "ai",
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, thankYouMessage])
          
          setTimeout(() => {
            const painPointMessage: Message = {
              id: `pain-${Date.now()}`,
              content: "is there anything you don't enjoy doing?",
              sender: "ai",
              timestamp: new Date(),
              type: "bubbles",
              bubbles: ["Yes!", "Not really"]
            }
            setMessages(prev => [...prev, painPointMessage])
            setCurrentStep(3)
            setProgressStep(3)
            setHasUserSentMessage(true)
          }, 1000)
        } finally {
          setIsLoading(false)
        }
      }, 500)
    }
  }

  const sendToGroqAPI = async (data: UserData) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/teachers-groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          helpType: data.helpType,
          classes: data.classes,
          gradeLevel: data.gradeLevel
        })
      })
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      // Add AI response based on type
      const aiResponse: Message = {
        id: Date.now().toString(),
        content: result.type === "structured" ? result.data.summary : result.message,
        sender: "ai",
        timestamp: new Date(),
        type: result.type === "structured" ? "structured" : "text",
        structuredData: result.type === "structured" ? result.data : undefined
      }
      setMessages(prev => [...prev, aiResponse])
      
      // Show CTA after first artifact
      if (result.type === "structured") {
        setShowCTA(true)
        setTimeSaved(prev => prev + 14) // Base time saved for creating content
      }
      
    } catch (error) {
      console.error('Error:', error)
      toast.error("Sorry, I had trouble processing that. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // duplicate removed - logic is consolidated in the earlier handleEmbeddedSubmit

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || currentInput
    if (!textToSend.trim() || isLoading) return

    // Mark that user has sent a message (hides carousel and shows type animation)
    setHasUserSentMessage(true)
    if (conversationStep === 1) {
      setShowTypeAnimation(true)
    }
    analytics.trackMessageSent('user', textToSend.length)

    // Only add user message if not already added (for quick starters)
    if (!messageText) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: textToSend,
        sender: "user",
        timestamp: new Date(),
        type: "text"
      }
      setMessages(prev => [...prev, userMessage])
    }
    
    setCurrentInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/teachers-groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          userData: { ...userData, name: userName, role: userRole },
          context: messages.slice(-10), // Last 10 messages for context
          currentStep: conversationStep,
          selectedChallenge,
          resourceType: currentResourceType,
          meetingBooked,
          conversationGoal: conversationStep >= 4 ? 'generate_plan' : 'conversation'
        })
      })
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText)
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now().toString(),
          content: result.message || result.content || "I'm here to help!",
          sender: "ai",
          timestamp: new Date(),
          type: result.type || "text",
          step: result.step,
          challenge_areas: result.challenge_areas,
          plan: result.plan,
          qa_options: result.qa_options,
          cal_link: result.cal_link,
          meeting_hint: result.meeting_hint,
          resource: result.resource,
          resourceType: result.resourceType || result.plan?.resource_type,
          generated_content: result.generated_content
        }
        
        setMessages(prev => [...prev, aiResponse])
        
        // Update conversation step if provided
        if (result.step) {
          setConversationStep(result.step)
        }
        
        // Set resource type for meeting nudge
        if (result.plan?.resource_type) {
          setCurrentResourceType(result.plan.resource_type)
        }
        
        setIsLoading(false)
      }, 500)
      
    } catch (error) {
      console.error('Error:', error)
      toast.error("Sorry, I'm having trouble responding right now. Please try again!")
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getUserRoleOptions = (role: string) => {
    const baseOptions = ["lesson plan", "rubric", "quiz", "assignment"]
    
    switch (role.toLowerCase()) {
      case "teacher":
        return [...baseOptions, "parent email", "classroom activity"]
      case "counselor":
        return ["student check-in form", "intervention plan", "parent meeting notes", "referral letter"]
      case "admin":
        return ["staff memo", "parent communication", "policy document", "meeting agenda"]
      default:
        return baseOptions
    }
  }

  const handlePreChatComplete = () => {
    analytics.trackPreChatComplete()
    setShowPreChat(false)
    localStorage.setItem("teachers-prechat-complete", "true")
    loadDefaultMessages()
  }

  const clearChat = () => {
    // Clear all state
    setMessages([])
    setUserData({ gradeLevel: "high school" })
    setCurrentStep(0)
    setTimeSaved(0)
    setShowCTA(false)
    setHasUserSentMessage(false)
    setShowPreChat(true)
    setUserName('')
    setUserRole('')
    setShowProgress(false)
    setProgressStep(1)
    setFinalPlan(null)
    setShowMeetingBooking(false)
    setChangeRequestInput('')
    setCurrentInput('')
    setFullScreenMessage(null)
    
    // Clear localStorage
    localStorage.removeItem("teachers-chat-history")
    localStorage.removeItem("teachers-user-data") 
    localStorage.removeItem("teachers-current-step")
    localStorage.removeItem("teachers-has-user-sent")
    localStorage.removeItem("teachers-prechat-complete")
    
    // Force analytics to track pre-chat view again
    analytics.trackPreChatView()
    
    console.log('Chat cleared - returning to pre-chat mode')
  }

  const handleTimeSaved = (minutes: number) => {
    setTimeSaved(prev => prev + minutes)
  }

  const TimeSavedMeter = () => (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-green-600" />
          <span className="text-green-800 font-medium">
            You saved ~{timeSaved} minutes today!
          </span>
        </div>
        <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
          Book with Hudson
        </Button>
      </div>
    </div>
  )

  const CTABanner = () => (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="text-center">
        <h3 className="font-semibold text-blue-900 mb-2">
          Get your first unit plan set up in 10 minutes
        </h3>
        <div className="flex space-x-3 justify-center">
          <Button variant="outline" className="border-blue-300 text-blue-700">
            Continue as guest
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Create free teacher account
          </Button>
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Save history • 1-click standards • Reusable templates • Priority support
        </p>
      </div>
    </div>
  )



  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header with Logo and Navigation (hidden on localhost) */}
      {!isLocalhost && (
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Image
              src="/ai-club-logo.png"
              alt="Henry AI Club"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="font-semibold text-gray-900">Henry AI Club</span>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-3">
            <button
              onClick={clearChat}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Reset Chat {showPreChat ? '(Pre-Chat)' : '(Main Chat)'} - Debug: {showPreChat.toString()}
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </button>
          </div>
        </div>
      </div>
      )}
      {/* Pre-Chat Simulation or Main Chat */}
      {showPreChat ? (
        <PreChatSimulation onComplete={handlePreChatComplete} />
      ) : (
        <>
          {/* Progress Bar */}
          {showProgress && (
            <div className="bg-white border-b border-gray-100 px-4 py-2">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                <span className="text-sm text-gray-600">{progressStep} steps to your custom plan</span>
                <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progressStep / 3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Chat Messages Area - Flexible height */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 w-full overscroll-contain" style={{ minHeight: 0 }}>
            {/* Time Saved Meter */}
            {timeSaved > 0 && <TimeSavedMeter />}
            
            {/* CTA Banner */}
            {showCTA && <CTABanner />}
        
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} w-full animate-in fade-in-0 slide-in-from-bottom-6 duration-1000 ease-out`} style={{ 
            animationFillMode: 'both',
            animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div className={`flex items-start space-x-4 max-w-full ${isMobile ? 'max-w-[95%]' : 'max-w-[90%]'} ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {/* Profile Picture */}
              {message.sender === 'ai' && (
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-md transform hover:scale-105 hover:shadow-lg transition-all duration-200 ease-out">
                  <Image
                    src="/ai-club-logo.png"
                    alt="AI Assistant"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {message.sender === 'user' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md transform hover:scale-105 hover:shadow-lg transition-all duration-200 ease-out">
                  <span className="text-white font-medium text-sm">
                    {userData.name ? userData.name.charAt(0).toUpperCase() : 'T'}
                  </span>
                </div>
              )}

              {/* Message Content */}
              {message.type === 'final-plan' && message.finalPlan ? (
                <FinalPlanCard
                  title={message.finalPlan.title}
                  description={message.finalPlan.description}
                  timeSaved={message.finalPlan.timeSaved}
                  details={message.finalPlan.details}
                  onTryNow={() => {
                    analytics.trackPlanTryNow(message.finalPlan?.title || 'Unknown Plan')
                    toast.success("Starting your plan...")
                    // Implement try now functionality
                  }}
                  onBookMeeting={() => {
                    analytics.trackMeetingBookingOpened()
                    setShowMeetingBooking(true)
                  }}
                  onRequestChange={() => {
                    analytics.trackChangeRequested()
                    setShowMeetingBooking(true)
                    toast.info("Please book a meeting to request changes")
                  }}
                />
              ) : message.type === 'multi-question' && message.questions ? (
                <MultiQuestionComponent
                  questions={message.questions}
                  currentIndex={message.currentQuestionIndex || 0}
                  answers={message.answers || []}
                  onAnswerSubmit={async (index, answer) => {
                    // Update the message with the new answer
                    const updatedAnswers = [...(message.answers || [])]
                    updatedAnswers[index] = answer
                    
                    setMessages(prev => prev.map(msg => 
                      msg.id === message.id 
                        ? { 
                            ...msg, 
                            answers: updatedAnswers,
                            currentQuestionIndex: Math.min(index + 1, message.questions!.length - 1)
                          }
                        : msg
                    ))
                    
                    // If all questions are answered, check with Groq if more info is needed
                    if (updatedAnswers.length === message.questions!.length && updatedAnswers.every(a => a?.trim())) {
                      setIsLoading(true)
                      
                      try {
                        const response = await fetch('/api/teachers-groq', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: userName,
                            userRole: userRole,
                            problemDescription: userData.problemDescription,
                            answers: updatedAnswers
                          })
                        })
                        
                        if (!response.ok) {
                          console.error('API response not ok:', response.status, response.statusText)
                          throw new Error(`API request failed: ${response.status} ${response.statusText}`)
                        }
                        const result = await response.json()
                        
                        let followupData
                        try {
                          followupData = JSON.parse(result.content || result.message)
                        } catch {
                          followupData = { needs_more: false }
                        }
                        
                        if (followupData.needs_more && followupData.questions?.length > 0) {
                          // More questions needed
                          setTimeout(() => {
                            const moreQuestionsMessage: Message = {
                              id: `more-questions-${Date.now()}`,
                              content: "i need a bit more detail",
                              sender: "ai",
                              timestamp: new Date(),
                              type: "text"
                            }
                            setMessages(prev => [...prev, moreQuestionsMessage])
                            
                            setTimeout(() => {
                              const nextMultiQuestionMessage: Message = {
                                id: `multi-questions-${Date.now()}`,
                                content: "additional questions",
                                sender: "ai",
                                timestamp: new Date(),
                                type: "multi-question",
                                questions: followupData.questions,
                                currentQuestionIndex: 0,
                                answers: []
                              }
                              setMessages(prev => [...prev, nextMultiQuestionMessage])
                            }, 500)
                          }, 500)
                        } else {
                          // Ready to generate
                          setTimeout(() => {
                            const generateMessage: Message = {
                              id: `generate-${Date.now()}`,
                              content: "perfect! what would you like me to help you generate?",
                              sender: "ai",
                              timestamp: new Date(),
                              type: "bubbles",
                              bubbles: getUserRoleOptions(userRole)
                            }
                            setMessages(prev => [...prev, generateMessage])
                            setCurrentStep(5)
                          }, 1000)
                        }
                        
                      } catch (error) {
                        console.error('Error checking for more questions:', error)
                        // Fallback to generation step
                        setTimeout(() => {
                          const generateMessage: Message = {
                            id: `generate-${Date.now()}`,
                            content: "perfect! what would you like me to help you generate?",
                            sender: "ai",
                            timestamp: new Date(),
                            type: "bubbles",
                            bubbles: getUserRoleOptions(userRole)
                          }
                          setMessages(prev => [...prev, generateMessage])
                          setCurrentStep(5)
                        }, 1000)
                      } finally {
                        setIsLoading(false)
                      }
                    }
                  }}
                />
              ) : message.type === 'problem_discovery' && message.challenge_areas ? (
                <div className="space-y-4">
                  <div className="bg-white/95 border border-gray-200 rounded-2xl p-4">
                    <p className="text-gray-800 mb-4">{message.content}</p>
                    {message.challenge_areas.map((area, index) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <h4 className="font-medium text-gray-900 mb-2">{area.area}</h4>
                        <p className="text-sm text-gray-600 mb-3">{area.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {area.example_pills.map((pill, pillIndex) => (
                            <button
                              key={pillIndex}
                              onClick={() => {
                                setSelectedChallenge(area.area)
                                setConversationStep(3)
                                handleSendMessage(pill)
                              }}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                            >
                              {pill}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : message.type === 'deep_dive' && message.questions ? (
                <div className="space-y-4">
                  <div className="bg-white/95 border border-gray-200 rounded-2xl p-4">
                    <p className="text-gray-800 mb-4">{message.content}</p>
                    {message.questions.map((q: any, index: number) => (
                      <div key={index} className="mb-4 last:mb-0">
                        <p className="text-sm text-gray-700 mb-2">{q.question}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.example_pills?.map((pill: string, pillIndex: number) => (
                            <button
                              key={pillIndex}
                              onClick={() => {
                                setConversationStep(4)
                                handleSendMessage(pill)
                              }}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm hover:bg-green-200 transition-colors"
                            >
                              {pill}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {message.meeting_hint && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">{message.meeting_hint}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : message.type === 'plan_creation' && message.plan ? (
                <PlanComponent
                  plan={message.plan}
                  onApprove={() => {
                    setConversationStep(5)
                    setCurrentResourceType(message.plan!.resource_type)
                    // Trigger meeting nudge
                    setTimeout(() => {
                      const meetingMessage: Message = {
                        id: Date.now().toString(),
                        content: `Schedule a meeting with Hudson to view your ${message.plan!.resource_type} 💛`,
                        sender: "ai",
                        timestamp: new Date(),
                        type: "meeting_nudge",
                        resourceType: message.plan!.resource_type,
                        qa_options: {
                          pills: ["Why?", "What will we do?"],
                          free_text_available: true
                        },
                        cal_link: "https://cal.com/hudsonmp/henry-ai-club"
                      }
                      setMessages(prev => [...prev, meetingMessage])
                    }, 1000)
                  }}
                  onEdit={(editInstructions) => {
                    // Handle plan edit request
                    handleSendMessage(`Please modify the plan: ${editInstructions}`)
                  }}
                />
              ) : message.type === 'meeting_nudge' ? (
                <MeetingNudge
                  resourceType={message.resourceType || currentResourceType}
                  onQuestionSubmit={(question, type) => {
                    // Handle Q&A about the meeting
                    const response = fetch('/api/teachers-groq', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: question,
                        conversationGoal: 'meeting_qa',
                        userData: { name: userName, role: userRole }
                      })
                    })
                    .then(res => res.json())
                    .then(result => {
                      const qaMessage: Message = {
                        id: Date.now().toString(),
                        content: result.message,
                        sender: "ai",
                        timestamp: new Date(),
                        type: "meeting_qa"
                      }
                      setMessages(prev => [...prev, qaMessage])
                    })
                  }}
                  onMeetingBooked={() => {
                    setMeetingBooked(true)
                    setConversationStep(6)
                    toast.success("Meeting booked! Your resource is being generated...")
                    
                    // Generate final resource
                    setTimeout(() => {
                      fetch('/api/teachers-groq', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          conversationGoal: 'deliver_resource',
                          meetingBooked: true,
                          resourceType: currentResourceType,
                          userData: { name: userName, role: userRole },
                          context: messages.slice(-10)
                        })
                      })
                      .then(res => res.json())
                      .then(result => {
                        if (result.resource) {
                          const resourceMessage: Message = {
                            id: Date.now().toString(),
                            content: `Here's your ${currentResourceType}!`,
                            sender: "ai",
                            timestamp: new Date(),
                            type: "final_resource",
                            resource: result.resource
                          }
                          setMessages(prev => [...prev, resourceMessage])
                        }
                      })
                    }, 2000)
                  }}
                />
              ) : message.type === 'meeting_qa' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-blue-800">{message.content}</p>
                </div>
              ) : message.type === 'final_resource' && message.resource ? (
                <ResourceContainer
                  title={message.resource.title}
                  date={message.resource.date}
                  author={message.resource.author}
                  content={message.resource.content}
                  footerNote={message.resource.footer_note}
                  resourceType={currentResourceType as any}
                />
              ) : message.type === 'generated_content' && message.generated_content ? (
                <div className="space-y-3">
                  <div className="whitespace-pre-wrap text-gray-800">{message.content}</div>
                  <GeneratedContentCard
                    title={message.generated_content.title}
                    content={message.generated_content.content}
                    type={message.generated_content.content_type as any}
                  />
                  {message.cal_link && (
                    <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      📅 Need more help? <a href={message.cal_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Book a meeting with Hudson</a>
                    </div>
                  )}
                </div>
              ) : (
              <div className={`rounded-2xl px-4 py-3 ${(message.type === 'embedded-input' || message.type === 'input-embedded') ? 'max-w-[95%]' : 'max-w-[80%]'} shadow-sm backdrop-blur-sm transform hover:scale-[1.01] hover:shadow-md transition-all duration-200 ease-out ${
                message.sender === 'user' 
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800' 
                  : message.type === 'structured' 
                    ? 'bg-white/95 border border-gray-200/50 p-0 cursor-pointer hover:bg-white hover:border-gray-300' 
                    : 'bg-white/95 border border-gray-200/50 text-gray-800 hover:bg-white hover:border-gray-300'
              }`}
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
              onClick={() => message.type === 'structured' && message.structuredData ? setFullScreenMessage(message) : undefined}>
                {message.type === 'structured' && message.structuredData ? (
                  <div className="p-4">
                    <div className="whitespace-pre-wrap mb-4 text-gray-900">{message.content}</div>
                    <ArtifactCards data={message.structuredData} onTimeSaved={handleTimeSaved} />
                    <div className="mt-3 text-xs text-gray-500 text-center">
                      Click to view full screen
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.cal_link && message.sender === 'ai' && (
                      <div className="mt-3 text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        📅 Need more help? <a href={message.cal_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Book a meeting with Hudson</a>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Bubbles */}
                {message.type === 'bubbles' && message.bubbles && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.bubbles.map((bubble, index) => (
                      <button
                        key={index}
                        onClick={() => handleBubbleClick(bubble)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-gray-300 shadow-sm"
                      >
                        {bubble}
                      </button>
                    ))}
                  </div>
                )}

                {/* Embedded Input */}
                {(message.type === 'input-embedded' || message.type === 'embedded-input') && (
                  <div className="mt-3">
                    <div className="flex space-x-2">
                      <Input
                        value={message.inputValue || ''}
                        onChange={(e) => handleEmbeddedInput(message.id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEmbeddedSubmit(message.id, message.inputValue || '')
                          }
                        }}
                        placeholder={message.inputPrompt || message.embeddedInput?.placeholder}
                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 rounded-full"
                      />
                      <Button
                        onClick={() => handleEmbeddedSubmit(message.id, message.inputValue || '')}
                        disabled={!message.inputValue?.trim()}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
                <Image
                  src="/ai-club-logo.png"
                  alt="AI Assistant"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            </div>
          </div>
        )}
        
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Section - Fixed at bottom */}
      <div className="flex-shrink-0 bg-gray-50 border-t border-gray-100">
        {/* Quick Starters Carousel - Show until user sends a message */}
        {!hasUserSentMessage && (
          <div className="px-4 pt-2 pb-2">
            <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-2">
              {[
                "Grade these assignments",
                "Create a 5 question math quiz", 
                "Generate an assignment rubric",
                "Brainstorm 1st day activities"
              ].map((starter, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Clear default messages first
                    setMessages([])
                    setCurrentStep(0)
                    setHasUserSentMessage(true)
                    
                    // Send the starter message
                    const userMessage: Message = {
                      id: Date.now().toString(),
                      content: starter,
                      sender: "user",
                      timestamp: new Date(),
                      type: "text"
                    }
                    setMessages([userMessage])
                    setCurrentInput("")
                    
                    // Process with AI
                    setTimeout(() => {
                      handleSendMessage(starter)
                    }, 100)
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-colors border border-gray-300 shadow-sm whitespace-nowrap flex-shrink-0 touch-manipulation"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasUserSentMessage && (/* Input Area - Always at bottom */
        <div className="p-4 w-full">
          <div 
            className={`flex items-center space-x-3 w-full max-w-4xl mx-auto transition-all duration-1000 ${
              showTypeAnimation ? 'animate-pulse border-2 border-blue-300 rounded-full p-2' : ''
            }`}
            style={{
              animation: showTypeAnimation ? 'gentle-glow 2s ease-in-out' : undefined
            }}
          >
            <div className="flex-1 relative">
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Message Henry AI..."
                className={`w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-full px-6 py-3 bg-gray-50 border-0 focus:bg-white shadow-sm pr-12 touch-manipulation transition-all duration-500 ${
                  showTypeAnimation ? 'ring-2 ring-blue-300 bg-blue-50' : ''
                }`}
                disabled={isLoading}
                autoFocus={isMobile}
                onFocus={() => setShowTypeAnimation(false)}
              />
            </div>
            <div 
              className={`w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-sm transition-all duration-500 cursor-pointer touch-manipulation select-none ${
                showTypeAnimation ? 'ring-2 ring-blue-300 scale-110' : ''
              }`}
              onClick={() => handleSendMessage()}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </div>
          </div>

          {/* Add CSS for the glow animation */}
          {showTypeAnimation && (
            <style jsx>{`
              @keyframes gentle-glow {
                0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
                50% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }
              }
            `}</style>
          )}
          
          {/* Trust Row */}
          <div className="mt-3 space-y-1 max-w-4xl mx-auto">
            <div className="text-center text-xs text-gray-400">
              Built by Henry AI Club • FERPA-friendly • You own your data
            </div>
            <div className="text-center text-xs text-gray-400">
              No student PII. Keep examples generic. 
              <button className="underline ml-1 touch-manipulation" onClick={() => toast.info("FERPA compliance info coming soon!")}>
                Why?
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
        </>
      )}

      {/* Meeting Booking Modal */}
      {showMeetingBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Book Your Setup Session</h2>
              <button
                onClick={() => setShowMeetingBooking(false)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <MeetingBooking 
                userName={userName}
                onBooked={() => {
                  analytics.trackMeetingBooked()
                  setShowMeetingBooking(false)
                  toast.success("🎉 you're on my calendar!")
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Modal */}
      {fullScreenMessage && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          {/* Header with close button */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm">
                <Image
                  src="/ai-club-logo.png"
                  alt="AI Assistant"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-medium text-gray-900">Henry AI Assistant</div>
                <div className="text-sm text-gray-500">Generated content</div>
              </div>
            </div>
            <button
              onClick={() => setFullScreenMessage(null)}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{fullScreenMessage?.content}</h1>
              <div className="text-sm text-gray-500">
                {fullScreenMessage?.timestamp && formatTime(new Date(fullScreenMessage.timestamp))}
              </div>
            </div>
            
            {fullScreenMessage?.structuredData && (
              <ArtifactCards 
                data={fullScreenMessage.structuredData} 
                onTimeSaved={handleTimeSaved} 
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
