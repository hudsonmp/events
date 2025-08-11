'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'

interface PreChatSimulationProps {
  onComplete: () => void
}

const messages = [
  { id: 1, sender: 'grey', content: 'hey tim, have you seen this new tool?', delay: 800 },
  { id: 2, sender: 'blue', content: "nah, i've been swamped preparing for the school year 😭", delay: 2500 },
  { id: 3, sender: 'grey', content: 'henry ai club built me a tool to help with tracking attendance and generating a syllabus 😁🤖', delay: 4500 },
  { id: 4, sender: 'blue', content: 'wait, how?', delay: 6500 },
  { id: 5, sender: 'grey', content: 'just click here and see for yourself!', delay: 8000 },
]

export default function PreChatSimulation({ onComplete }: PreChatSimulationProps) {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleMessages])

  useEffect(() => {
    console.log('PreChatSimulation mounted - starting message sequence')
    
    // Reset visible messages first
    setVisibleMessages([])
    
    // Show messages with timing
    messages.forEach((message) => {
      setTimeout(() => {
        setVisibleMessages(prev => [...prev, message.id])
      }, message.delay)
    })
  }, [])

  return (
    <div className="flex-1 overflow-y-auto p-6 w-full bg-white">
      <div className="max-w-3xl mx-auto space-y-8 pt-12">
        
        {messages.map((message) => {
          const isVisible = visibleMessages.includes(message.id)
          if (!isVisible) return null

          return (
            <div
              key={message.id}
              className={`flex ${message.sender === 'blue' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-700 ease-out`}
            >
              <div className={`flex items-start space-x-4 max-w-[85%] ${message.sender === 'blue' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Profile Picture */}
                <div className="w-14 h-14 rounded-full flex-shrink-0 shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
                  <Image
                    src={message.sender === 'grey' ? '/woman.png' : '/man.png'}
                    alt={message.sender === 'grey' ? 'Female Teacher' : 'Male Teacher'}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Message Content */}
                <div className={`rounded-3xl px-6 py-4 shadow-lg transform hover:scale-[1.02] transition-all duration-200 ${
                  message.sender === 'grey'
                    ? 'bg-white border border-gray-200 text-gray-800'
                    : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                }`}>
                  <p className="text-lg leading-relaxed font-medium">{message.content}</p>
                </div>
              </div>
            </div>
          )
        })}

        {/* Inline Button Message */}
        {visibleMessages.length === messages.length && (
          <div className="flex justify-start animate-in slide-in-from-bottom-4 duration-700 ease-out">
            <div className="flex items-start space-x-4 max-w-[85%]">
              {/* Profile Picture */}
              <div className="w-14 h-14 rounded-full flex-shrink-0 shadow-lg overflow-hidden transform hover:scale-105 transition-transform">
                <Image
                  src="/woman.png"
                  alt="Female Teacher"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Button as Message */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={onComplete}
                  className="bg-gradient-to-r from-green-500 via-green-600 to-yellow-500 hover:from-green-600 hover:via-green-700 hover:to-yellow-600 text-white px-12 py-4 rounded-full font-bold text-xl shadow-2xl transform hover:scale-105 transition-all duration-300 border-2 border-white/20"
                >
                  🚀 Try Henry AI Now
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
