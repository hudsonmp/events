"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InstagramSearch } from "@/components/instagram-search"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { User, Phone, GraduationCap, Instagram, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react"

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

interface OnboardingData {
  firstName: string
  lastName: string
  phoneNumber: string
  grade: string
  instagramUsername: string | null
}

const STEPS = [
  { id: 'personal', title: 'Personal Info', icon: User },
  { id: 'contact', title: 'Contact & School', icon: Phone },
  { id: 'instagram', title: 'Instagram', icon: Instagram },
  { id: 'complete', title: 'Complete', icon: CheckCircle }
]

export function OnboardingModal({ isOpen, onClose, userId }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    grade: '',
    instagramUsername: null
  })

  const supabase = createClient()

  const updateData = (field: keyof OnboardingData, value: string | null) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0: // Personal Info
        return data.firstName.trim() && data.lastName.trim()
      case 1: // Contact & School
        return data.grade
      case 2: // Instagram (optional)
        return true
      default:
        return true
    }
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeOnboarding = async () => {
    setLoading(true)
    try {
      // Update the user's record in the users table
      const { error } = await supabase
        .from('users')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber || null,
          grade: data.grade ? parseInt(data.grade) : null,
          instagram_username: data.instagramUsername
        })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user:', error)
        toast.error('Failed to save your information. Please try again.')
        return
      }

      // Show success and close
      toast.success('Welcome to Henry AI! Your profile has been set up.')
      onClose()
    } catch (error) {
      console.error('Onboarding error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInstagramSelect = (username: string | null) => {
    updateData('instagramUsername', username)
    nextStep()
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-none bg-white shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-6">
          <DialogTitle className="text-center text-2xl font-bold text-gray-900">
            Complete Your Profile
          </DialogTitle>
          <div className="space-y-4">
            <Progress value={progress} className="w-full h-2" />
            
            {/* Step indicators */}
            <div className="flex justify-between items-center">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = index === currentStep
                const isCompleted = index < currentStep
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-2 ${
                      isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive 
                          ? 'bg-purple-100 border-2 border-purple-600' 
                          : isCompleted 
                            ? 'bg-green-100 border-2 border-green-600' 
                            : 'bg-gray-100 border-2 border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium hidden sm:block">{step.title}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Personal Information */}
          {currentStep === 0 && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <User className="h-12 w-12 text-purple-600 mx-auto" />
                <h3 className="text-xl font-semibold text-gray-900">What's your name?</h3>
                <p className="text-gray-600">Help your classmates find you</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      value={data.firstName}
                      onChange={(e) => updateData('firstName', e.target.value)}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      value={data.lastName}
                      onChange={(e) => updateData('lastName', e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Contact & School Information */}
          {currentStep === 1 && (
            <motion.div
              key="contact"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <GraduationCap className="h-12 w-12 text-purple-600 mx-auto" />
                <h3 className="text-xl font-semibold text-gray-900">School & Contact Info</h3>
                <p className="text-gray-600">Help us connect you with the right classmates</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Level *</Label>
                  <Select value={data.grade} onValueChange={(value) => updateData('grade', value)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">9th Grade (Freshman)</SelectItem>
                      <SelectItem value="10">10th Grade (Sophomore)</SelectItem>
                      <SelectItem value="11">11th Grade (Junior)</SelectItem>
                      <SelectItem value="12">12th Grade (Senior)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number (optional)</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={data.phoneNumber}
                    onChange={(e) => updateData('phoneNumber', e.target.value)}
                    className="h-12"
                  />
                  <p className="text-xs text-gray-500">
                    We'll only use this for important updates about your events
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Instagram Connection */}
          {currentStep === 2 && (
            <motion.div
              key="instagram"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <InstagramSearch 
                onSelect={handleInstagramSelect}
                onSkip={() => nextStep()}
                loading={loading}
              />
            </motion.div>
          )}

          {/* Step 4: Completion */}
          {currentStep === 3 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle className="h-12 w-12 text-white" />
              </motion.div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900">You're all set!</h3>
                <div className="text-gray-600 space-y-2">
                  <p>Welcome to Henry AI, {data.firstName}! 🎉</p>
                  <p>Your profile is complete and you're ready to:</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Find classmates in your schedule</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Join events and activities</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Connect with other students</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={completeOnboarding}
                disabled={loading}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
              >
                {loading ? 'Setting up your profile...' : 'Get Started'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        {currentStep < 3 && (
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0 || loading}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>

            <Button
              onClick={nextStep}
              disabled={!validateCurrentStep() || loading}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              <span>{currentStep === 2 ? 'Skip & Continue' : 'Continue'}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
