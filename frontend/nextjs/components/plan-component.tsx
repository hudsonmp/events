'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface PlanComponentProps {
  plan: {
    reasoning: string
    steps: string[]
    resource_type: string
  }
  onApprove: () => void
  onEdit: (editInstructions: string) => void
}

export default function PlanComponent({ plan, onApprove, onEdit }: PlanComponentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editInstructions, setEditInstructions] = useState('')

  const handleSuggestEdits = () => {
    if (!editInstructions.trim()) {
      toast.error("Please provide instructions for how to improve the plan")
      return
    }
    
    onEdit(editInstructions)
    setEditInstructions('')
    setIsEditing(false)
    toast.success("Edit suggestions sent!")
  }

  const handleApprove = () => {
    onApprove()
    toast.success("Plan approved!")
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-blue-500/20 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Your Personalized Plan
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Reasoning Section */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">Why This Approach</h3>
          <p className="text-blue-800 text-sm leading-relaxed">
            {plan.reasoning}
          </p>
        </div>

        {/* Steps Section */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Action Steps</h3>
          <div className="space-y-2">
            {plan.steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </div>
                <p className="text-gray-800 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Instructions */}
        {isEditing && (
          <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900">Suggest Changes</h3>
            <Textarea
              placeholder="Tell me what you'd like changed about this plan..."
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={handleSuggestEdits}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Edit className="w-4 h-4 mr-1" />
                Send Edits
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setIsEditing(false)}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <Button 
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            className="flex items-center space-x-2"
            disabled={isEditing}
          >
            <Edit className="w-4 h-4" />
            <span>✏️ Suggest Edits</span>
          </Button>
          
          <Button 
            onClick={handleApprove}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
            disabled={isEditing}
          >
            <Check className="w-4 h-4" />
            <span>✅ Approve</span>
          </Button>
        </div>

        {/* Resource Type Hint */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          This plan will generate your {plan.resource_type} once approved
        </div>
      </CardContent>
    </Card>
  )
}
