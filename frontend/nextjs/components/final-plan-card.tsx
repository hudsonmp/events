'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, ChevronRight, Calendar, MessageSquare } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { analytics } from '@/lib/analytics'

interface FinalPlanCardProps {
  title: string
  description: string
  timeSaved: number
  details?: any
  onTryNow: () => void
  onBookMeeting: () => void
  onRequestChange: () => void
}

export default function FinalPlanCard({
  title,
  description,
  timeSaved,
  details,
  onTryNow,
  onBookMeeting,
  onRequestChange
}: FinalPlanCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto border-2 border-green-500/20 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
              {title}
            </CardTitle>
            <div className="flex items-center space-x-1 text-green-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">~{timeSaved} min saved</span>
            </div>
          </div>
          <CardDescription className="mt-2">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={onTryNow}
              className="bg-gradient-to-r from-green-600 to-yellow-600 text-white hover:from-green-700 hover:to-yellow-700"
            >
              try it now
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button 
              onClick={() => {
                analytics.trackPlanExpanded(title)
                setShowDetails(true)
              }}
              variant="outline"
              className="border-gray-300"
            >
              Expand
            </Button>
            <Button 
              onClick={onRequestChange}
              variant="outline"
              className="border-gray-300"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              I want this changed
            </Button>
          </div>
          
          {/* Meeting CTA */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-700 mb-3">
              want me (hudson, a high school sophomore at henry) to set this up for you? i'll do it live in 10 minutes.
            </p>
            <Button 
              onClick={onBookMeeting}
              variant="outline"
              className="w-full border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book with Hudson
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">{description}</p>
            {details && (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button onClick={onTryNow} className="bg-gradient-to-r from-green-600 to-yellow-600 text-white">
                Try it now
              </Button>
              <Button onClick={() => setShowDetails(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
