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
import { analytics } from "@/lib/analytics"

interface Message {
  id: string
  content: string
  sender: "ai" | "user"
  timestamp: Date
  type?: "text" | "bubbles" | "input-embedded" | "structured" | "embedded-input" | "final-plan"
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
}

interface UserData {
  name?: string
  helpType?: string
  classes?: string
  gradeLevel: string
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  // Load confetti script
  useEffect(() => {
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
    
    // Check if pre-chat has been completed
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
    
    if (currentStep === 2) {
      // Role selection
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
              systemPrompt: `You are Henry, an enthusiastic AI assistant from the Henry AI Club! The user is a ${bubble} named ${userName}. Respond with a warm, engaging message saying it's nice to meet them, then ask what they find most challenging or time-consuming about their work. Be playful, use emojis, and make them feel appreciated. Keep it to 1-2 sentences.`
            })
          })
          
          if (!response.ok) throw new Error('Failed to get AI response')
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
              content: result.content,
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
              content: "anything you dread doing or is a pain in the a**?",
              sender: "ai",
              timestamp: new Date(),
              type: "text"
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
            bubbles: ["teacher", "counselor", "admin"]
          }
          setMessages(prev => [...prev, roleMessage])
          setCurrentStep(2)
          setProgressStep(2)
        }, 1500)
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
      
      if (!response.ok) throw new Error('Failed to get AI response')
      
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

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || currentInput
    if (!textToSend.trim() || isLoading) return

    // Mark that user has sent a message (hides carousel)
    setHasUserSentMessage(true)
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
          currentStep,
          conversationGoal: 'generate_final_plan'
        })
      })
      
      if (!response.ok) throw new Error('Failed to get AI response')
      
      const result = await response.json()
      
      setTimeout(() => {
        // Check if this is a final plan
        if (result.finalPlan) {
          setFinalPlan(result.finalPlan)
          analytics.trackFinalPlanViewed(result.finalPlan.title)
          
          const planMessage: Message = {
            id: Date.now().toString(),
            content: "",
            sender: "ai",
            timestamp: new Date(),
            type: "final-plan",
            finalPlan: result.finalPlan
          }
          setMessages(prev => [...prev, planMessage])
          
          // Trigger confetti
          if (typeof window !== 'undefined' && (window as any).confetti) {
            (window as any).confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            })
          }
        } else if (result.type === "structured") {
          const aiResponse: Message = {
            id: Date.now().toString(),
            content: result.data.summary || result.message,
            sender: "ai", 
            timestamp: new Date(),
            type: "structured",
            structuredData: result.data
          }
          setMessages(prev => [...prev, aiResponse])
          
          setShowCTA(true)
          setTimeSaved(prev => prev + (result.timeSaved || 14))
        } else {
          // Plain text response
          const aiResponse: Message = {
            id: Date.now().toString(),
            content: result.message,
            sender: "ai", 
            timestamp: new Date(),
            type: "text"
          }
          setMessages(prev => [...prev, aiResponse])
          
          // Check for idea pills
          if (result.ideas && result.ideas.length > 0) {
            setTimeout(() => {
              const ideaMessage: Message = {
                id: `ideas-${Date.now()}`,
                content: "or maybe you need help with:",
                sender: "ai",
                timestamp: new Date(),
                type: "bubbles",
                bubbles: result.ideas
              }
              setMessages(prev => [...prev, ideaMessage])
            }, 800)
          }
        }
        
        setIsLoading(false)
      }, 500)
      
    } catch (error) {
      console.error('Error:', error)
      toast.error("Sorry, I had trouble processing that. Please try again.")
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      {/* Header with Logo and Navigation */}
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
              ) : (
              <div className={`rounded-2xl px-4 py-3 max-w-[80%] shadow-sm backdrop-blur-sm transform hover:scale-[1.01] hover:shadow-md transition-all duration-200 ease-out ${
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
                  <div className="whitespace-pre-wrap">{message.content}</div>
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

        {/* Input Area - Always at bottom */}
        <div className="p-4 w-full">
          <div className="flex items-center space-x-3 w-full max-w-4xl mx-auto">
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
                className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-full px-6 py-3 bg-gray-50 border-0 focus:bg-white shadow-sm pr-12 touch-manipulation"
                disabled={isLoading}
                autoFocus={isMobile}
              />
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center shadow-sm transition-colors cursor-pointer touch-manipulation select-none" 
                 onClick={() => handleSendMessage()}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Send className="h-5 w-5 text-white" />
              )}
            </div>
          </div>
          
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
