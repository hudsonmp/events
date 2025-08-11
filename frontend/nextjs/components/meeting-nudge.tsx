'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, Send, Heart } from 'lucide-react'

interface MeetingNudgeProps {
  resourceType: string
  onQuestionSubmit: (question: string, type: 'pill' | 'custom') => void
  onMeetingBooked: () => void
  qaResponse?: string
}

export default function MeetingNudge({ 
  resourceType, 
  onQuestionSubmit, 
  onMeetingBooked,
  qaResponse 
}: MeetingNudgeProps) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [customQuestion, setCustomQuestion] = useState('')
  const [calendarLoaded, setCalendarLoaded] = useState(false)

  useEffect(() => {
    // Load Cal.com embed script
    if (showCalendar && !calendarLoaded) {
      const script = document.createElement('script')
      script.src = 'https://app.cal.com/embed/embed.js'
      script.async = true
      script.onload = () => setCalendarLoaded(true)
      document.body.appendChild(script)

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [showCalendar, calendarLoaded])

  const handlePillClick = (pill: string) => {
    onQuestionSubmit(pill, 'pill')
  }

  const handleCustomSubmit = () => {
    if (customQuestion.trim()) {
      onQuestionSubmit(customQuestion.trim(), 'custom')
      setCustomQuestion('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit()
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-purple-500/20 shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center justify-center space-x-2">
          <span>Schedule a meeting with Hudson to view your {resourceType}</span>
          <Heart className="w-5 h-5 text-yellow-500 fill-current" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Q&A Section */}
        {!showCalendar && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Questions about the meeting?</h3>
              
              {/* Response to previous question */}
              {qaResponse && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm">{qaResponse}</p>
                </div>
              )}
              
              {/* Quick question pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePillClick("Why?")}
                  className="text-sm"
                >
                  Why?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePillClick("What will we do?")}
                  className="text-sm"
                >
                  What will we do?
                </Button>
              </div>

              {/* Custom question input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Or ask your own question..."
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={handleCustomSubmit}
                  disabled={!customQuestion.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Schedule Button */}
            <div className="text-center">
              <Button
                onClick={() => setShowCalendar(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold"
                size="lg"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        )}

        {/* Calendar Embed */}
        {showCalendar && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Book your 15-minute session</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCalendar(false)}
              >
                Back
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              {calendarLoaded ? (
                <div 
                  className="w-full"
                  dangerouslySetInnerHTML={{
                    __html: `
                      <cal-inline 
                        data-cal-link="hudsonmp/henry-ai-club"
                        data-cal-config='${JSON.stringify({
                          theme: 'light',
                          hideEventTypeDetails: false
                        })}'
                        style="width:100%;height:100%;overflow:scroll;min-height:500px"
                      ></cal-inline>
                    `
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading calendar...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-center text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              🎉 You'll leave with your {resourceType} ready to use!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
