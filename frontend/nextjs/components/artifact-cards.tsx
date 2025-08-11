"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Clock, 
  FileText, 
  CheckSquare, 
  Mail, 
  Copy, 
  Download, 
  Edit3,
  Users,
  Target,
  BookOpen,
  Timer,
  Star,
  ExternalLink,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"

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

interface ArtifactCardsProps {
  data: StructuredResponse
  onTimeSaved?: (minutes: number) => void
}

export function ArtifactCards({ data, onTimeSaved }: ArtifactCardsProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [showDifferentiation, setShowDifferentiation] = useState(false)

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content)
    toast.success(`${type} copied to clipboard!`)
    onTimeSaved?.(3) // Saved 3 minutes by copying
  }

  const handleExport = (type: string) => {
    toast.success(`Exporting ${type} to Google Docs...`)
    onTimeSaved?.(10) // Saved 10 minutes by not creating from scratch
  }

  const ActionStrip = () => (
    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 w-full overflow-x-hidden">
      <div className="flex items-center justify-between mb-3 w-full">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <CheckSquare className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-blue-900 truncate">{data.summary}</span>
        </div>
        {data.confidence < 0.6 && (
          <Badge variant="outline" className="text-orange-600 border-orange-300 flex-shrink-0 ml-2">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Review
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2 w-full">
        {data.suggested_actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="bg-white hover:bg-blue-50 border-blue-300 text-blue-700 text-xs px-2 py-1"
            onClick={() => action === "Export" ? handleExport(data.task_type) : toast.info(`${action} feature coming soon!`)}
          >
            {action}
          </Button>
        ))}
      </div>
    </div>
  )

  const LessonPlanCard = () => {
    if (!data.lesson_plan) return null
    const plan = data.lesson_plan
    
    return (
      <Card className="mb-4 hover:shadow-lg transition-shadow cursor-pointer" 
            onClick={() => setExpandedCard(expandedCard === "lesson" ? null : "lesson")}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-green-600" />
            <span>Lesson Plan</span>
            <Badge variant="secondary">{plan.duration_minutes} min</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expandedCard === "lesson" ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Objective
                </h4>
                <p className="text-gray-700">{plan.objective}</p>
              </div>
              
              <div>
                <h4 className="font-semibold">Materials</h4>
                <ul className="list-disc list-inside text-gray-700">
                  {plan.materials.map((material, i) => (
                    <li key={i}>{material}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold flex items-center">
                  <Timer className="h-4 w-4 mr-2" />
                  Activities
                </h4>
                {plan.steps.map((step, i) => (
                  <div key={i} className="border-l-2 border-blue-200 pl-4 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{step.title}</span>
                      <span className="text-sm text-gray-500">{step.minutes} min</span>
                    </div>
                    <p className="text-gray-700 text-sm">{step.instructions}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-semibold">Assessment</h4>
                <p className="text-gray-700">{plan.assessment}</p>
              </div>

              {plan.standards.length > 0 && (
                <div>
                  <h4 className="font-semibold">Standards</h4>
                  <div className="flex flex-wrap gap-1">
                    {plan.standards.map((standard, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {standard}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              
              <div className="flex space-x-2">
                <Button 
                  variant="default" 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(JSON.stringify(plan, null, 2), "Lesson Plan")
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExport("Lesson Plan")
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">{plan.objective}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {plan.duration_minutes} minutes
                </span>
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {plan.steps.length} activities
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const RubricCard = () => {
    if (!data.rubric) return null
    const rubric = data.rubric
    
    return (
      <Card className="mb-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setExpandedCard(expandedCard === "rubric" ? null : "rubric")}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckSquare className="h-5 w-5 text-purple-600" />
            <span>Rubric</span>
            <Badge variant="secondary">{rubric.criteria.length} criteria</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expandedCard === "rubric" ? (
            <div className="space-y-4">
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse border border-gray-300 min-w-0">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-1 bg-gray-50 text-xs">Criteria</th>
                      {rubric.criteria[0]?.levels.map((level, i) => (
                        <th key={i} className="border border-gray-300 p-1 bg-gray-50 text-xs">
                          {level.level}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rubric.criteria.map((criterion, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 p-1 font-medium text-xs">
                          {criterion.name}
                        </td>
                        {criterion.levels.map((level, j) => (
                          <td key={j} className="border border-gray-300 p-1 text-xs">
                            {level.description}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <Separator />
              
              <div className="flex space-x-2">
                <Button 
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(JSON.stringify(rubric, null, 2), "Rubric")
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExport("Rubric")
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">Assessment rubric with {rubric.criteria.length} criteria</p>
              <div className="flex flex-wrap gap-1">
                {rubric.criteria.slice(0, 3).map((criterion, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {criterion.name}
                  </Badge>
                ))}
                {rubric.criteria.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{rubric.criteria.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const QuizCard = () => {
    if (!data.quiz) return null
    const quiz = data.quiz
    
    return (
      <Card className="mb-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setExpandedCard(expandedCard === "quiz" ? null : "quiz")}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Quick Quiz</span>
            <Badge variant="secondary">{quiz.items.length} questions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expandedCard === "quiz" ? (
            <div className="space-y-4">
              {quiz.items.map((item, i) => (
                <div key={i} className="border-l-2 border-blue-200 pl-4">
                  <p className="font-medium mb-2">Q{i + 1}. {item.prompt}</p>
                  {item.options && (
                    <div className="space-y-1">
                      {item.options.map((option, j) => (
                        <div key={j} className={`text-sm p-2 rounded ${
                          option === item.answer ? 'bg-green-100 text-green-800' : 'bg-gray-50'
                        }`}>
                          {option} {option === item.answer && '✓'}
                        </div>
                      ))}
                    </div>
                  )}
                  {!item.options && (
                    <p className="text-sm text-green-700 bg-green-100 p-2 rounded">
                      Answer: {item.answer}
                    </p>
                  )}
                </div>
              ))}
              
              <Separator />
              
              <div className="flex space-x-2">
                <Button 
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(JSON.stringify(quiz, null, 2), "Quiz")
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExport("Quiz")
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">{quiz.items.length} question quiz ready to use</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Multiple choice format</span>
                <span>Answer key included</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const EmailCard = () => {
    if (!data.email) return null
    const email = data.email
    
    return (
      <Card className="mb-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setExpandedCard(expandedCard === "email" ? null : "email")}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-orange-600" />
            <span>Parent Email</span>
            <Badge variant="secondary">Ready to send</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expandedCard === "email" ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Subject:</h4>
                <p className="text-gray-700 bg-gray-50 p-2 rounded">{email.subject}</p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-1">Body:</h4>
                <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap text-sm">
                  {email.body}
                </div>
              </div>
              
              <Separator />
              
              <div className="flex space-x-2">
                <Button 
                  variant="default"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(`Subject: ${email.subject}\n\n${email.body}`, "Email")
                  }}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.location.href = `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
                  }}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">{email.subject}</p>
              <p className="text-sm text-gray-500">Professional email draft ready to send</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const DifferentiationPanel = () => {
    if (!data.lesson_plan) return null
    
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <span>Differentiation & Supports</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDifferentiation(!showDifferentiation)}
            >
              {showDifferentiation ? 'Hide' : 'Show'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showDifferentiation && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {['ELL', 'IEP', 'Enrichment', 'Early Finishers'].map((type) => (
                <Button 
                  key={type}
                  variant="outline" 
                  size="sm"
                  onClick={() => toast.info(`${type} differentiation coming soon!`)}
                >
                  {type}
                </Button>
              ))}
            </div>
            {data.lesson_plan.differentiation.length > 0 && (
              <div className="space-y-2">
                {data.lesson_plan.differentiation.map((diff, i) => (
                  <div key={i} className="bg-purple-50 p-3 rounded border border-purple-200">
                    <span className="font-medium text-purple-800">{diff.type}:</span>
                    <span className="text-purple-700 ml-2">{diff.strategy}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    )
  }

  const CitationsFooter = () => (
    <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          {data.sources.length > 0 ? (
            <>
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Sources: {data.sources.join(', ')}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span>Teacher review recommended • Verify facts</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <span>Confidence:</span>
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                data.confidence >= 0.8 ? 'bg-green-500' : 
                data.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${data.confidence * 100}%` }}
            />
          </div>
          <span className="text-xs">{Math.round(data.confidence * 100)}%</span>
        </div>
      </div>
      {data.notes_for_teacher && (
        <p className="text-xs text-gray-600 mt-2">
          <strong>Note:</strong> {data.notes_for_teacher}
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      <ActionStrip />
      <LessonPlanCard />
      <RubricCard />
      <QuizCard />
      <EmailCard />
      <DifferentiationPanel />
      <CitationsFooter />
    </div>
  )
}
