'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Share2, Download, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface ResourceContainerProps {
  title: string
  date: string
  author: string
  content: any
  footerNote: string
  resourceType: 'lesson_plan' | 'rubric' | 'quiz' | 'email' | 'summary'
}

export default function ResourceContainer({
  title,
  date,
  author,
  content,
  footerNote,
  resourceType
}: ResourceContainerProps) {

  const handleCopyToClipboard = () => {
    const textContent = formatContentAsText()
    navigator.clipboard.writeText(textContent).then(() => {
      toast.success("Resource copied to clipboard!")
    }).catch(() => {
      toast.error("Failed to copy to clipboard")
    })
  }

  const handleDownload = () => {
    const textContent = formatContentAsText()
    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Resource downloaded!")
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Check out this ${resourceType.replace('_', ' ')} from Henry AI Club`,
        url: window.location.href
      }).catch(() => {
        // Fallback to copying link
        navigator.clipboard.writeText(window.location.href)
        toast.success("Link copied to clipboard!")
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard!")
    }
  }

  const formatContentAsText = () => {
    let text = `${title}\n`
    text += `Created: ${date}\n`
    text += `Author: ${author}\n\n`
    
    if (typeof content === 'string') {
      text += content
    } else {
      text += JSON.stringify(content, null, 2)
    }
    
    text += `\n\n${footerNote}`
    return text
  }

  const renderContent = () => {
    if (resourceType === 'lesson_plan' && content.objective) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Learning Objective</h3>
            <p className="text-gray-700">{content.objective}</p>
          </div>
          
          {content.standards && content.standards.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Standards</h3>
              <ul className="list-disc list-inside space-y-1">
                {content.standards.map((standard: string, index: number) => (
                  <li key={index} className="text-gray-700 text-sm">{standard}</li>
                ))}
              </ul>
            </div>
          )}
          
          {content.materials && content.materials.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Materials Needed</h3>
              <ul className="list-disc list-inside space-y-1">
                {content.materials.map((material: string, index: number) => (
                  <li key={index} className="text-gray-700 text-sm">{material}</li>
                ))}
              </ul>
            </div>
          )}
          
          {content.duration_minutes && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Duration</h3>
              <p className="text-gray-700">{content.duration_minutes} minutes</p>
            </div>
          )}
          
          {content.steps && content.steps.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Lesson Steps</h3>
              <div className="space-y-3">
                {content.steps.map((step: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-blue-900">{step.title}</h4>
                      <span className="text-sm text-blue-600">{step.minutes} min</span>
                    </div>
                    <p className="text-blue-800 text-sm">{step.instructions}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {content.assessment && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Assessment</h3>
              <p className="text-gray-700">{content.assessment}</p>
            </div>
          )}
          
          {content.differentiation && content.differentiation.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Differentiation</h3>
              <div className="space-y-2">
                {content.differentiation.map((diff: any, index: number) => (
                  <div key={index} className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-900">{diff.type}</h4>
                    <p className="text-green-800 text-sm">{diff.strategy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
    
    if (resourceType === 'rubric' && content.criteria) {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 mb-3">Grading Criteria</h3>
          <div className="space-y-4">
            {content.criteria.map((criterion: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2">
                  <h4 className="font-medium text-gray-900">{criterion.name}</h4>
                </div>
                <div className="p-4">
                  <div className="grid gap-3">
                    {criterion.levels.map((level: any, levelIndex: number) => (
                      <div key={levelIndex} className="flex items-start space-x-3 p-3 border border-gray-100 rounded">
                        <div className="font-medium text-blue-600 min-w-20">{level.level}</div>
                        <div className="text-gray-700 text-sm">{level.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    
    if (resourceType === 'quiz' && content.items) {
      return (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quiz Questions</h3>
          <div className="space-y-4">
            {content.items.map((item: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <span className="font-medium text-gray-900">Question {index + 1}: </span>
                  <span className="text-gray-700">{item.prompt}</span>
                </div>
                {item.options && (
                  <div className="space-y-2 ml-4">
                    {item.options.map((option: string, optIndex: number) => (
                      <div 
                        key={optIndex} 
                        className={`p-2 rounded ${item.answer === option ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + optIndex)})</span> {option}
                        {item.answer === option && <span className="text-green-600 ml-2">✓ Correct</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }
    
    if (resourceType === 'email' && content.subject && content.body) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Subject</h3>
            <div className="bg-gray-50 p-3 rounded border">
              <p className="text-gray-800">{content.subject}</p>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Email Body</h3>
            <div className="bg-gray-50 p-4 rounded border">
              <div className="whitespace-pre-wrap text-gray-800">{content.body}</div>
            </div>
          </div>
        </div>
      )
    }
    
    // Default fallback for other content types
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
          {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-2 border-green-500/20">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>{date}</span>
              <span>•</span>
              <span>by {author}</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Content */}
      <CardContent className="p-6">
        {renderContent()}
      </CardContent>
      
      {/* Footer */}
      <div className="bg-gray-50 border-t px-6 py-4">
        <p className="text-sm text-gray-600 text-center">{footerNote}</p>
      </div>
    </Card>
  )
}
