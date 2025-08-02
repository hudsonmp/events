"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, X, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { modalVariants, overlayVariants, SlideUp, buttonTapVariants } from "@/lib/motion"

interface AIGenerateModalProps {
  isOpen: boolean
  onClose: () => void
  onResult: (result: { title: string; description: string; tags: string[] }) => void
}

interface GroqResponse {
  title: string
  description: string
  tags: string[]
}

export function AIGenerateModal({ isOpen, onClose, onResult }: AIGenerateModalProps) {
  const [step, setStep] = useState(1)
  const [eventDescription, setEventDescription] = useState("")
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleClose = () => {
    setStep(1)
    setEventDescription("")
    setAdditionalInfo("")
    setIsGenerating(false)
    onClose()
  }

  const handleNext = () => {
    if (step === 1) {
      if (!eventDescription.trim()) {
        toast.error("Please describe your event first")
        return
      }
      setStep(2)
    }
  }

  const handleGenerate = async () => {
    if (!eventDescription.trim()) {
      toast.error("Please provide an event description")
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: eventDescription,
          additionalInfo: additionalInfo
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate event details")
      }

      const data: GroqResponse = await response.json()
      
      onResult({
        title: data.title,
        description: data.description,
        tags: data.tags
      })
      
      handleClose()
      
    } catch (error) {
      console.error("Error generating event:", error)
      toast.error("Failed to generate event details. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          <DialogContent className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] border-0 bg-transparent p-0 shadow-none">
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalVariants}
              className="sm:max-w-lg max-w-md border border-slate-600 bg-slate-800 text-white shadow-2xl p-0 overflow-hidden rounded-3xl"
            >
              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>

              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle className="text-center text-lg font-semibold text-white flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                      scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-blue-400" />
                  </motion.div>
                  Generate with AI
                </DialogTitle>
              </DialogHeader>

              <div className="px-6 pb-6">
                <div className="relative overflow-hidden">
                  {/* Step Container */}
                  <motion.div 
                    className="flex transition-transform duration-500 ease-in-out"
                    animate={{ x: `${-(step - 1) * 100}%` }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  >
                    {/* Step 1: Event Description */}
                    <motion.div 
                      className="w-full flex-shrink-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: step === 1 ? 1 : 0.5 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="bg-slate-700/50 backdrop-blur border-slate-600 shadow-lg">
                        <CardContent className="p-4 space-y-3">
                          <SlideUp delay={0.2}>
                            <div className="text-center mb-3">
                              <h3 className="text-sm font-medium text-white mb-1">
                                Describe your event
                              </h3>
                              <p className="text-slate-400 text-xs">
                                Give us a brief idea of what you're planning
                              </p>
                            </div>
                          </SlideUp>
                          
                          <SlideUp delay={0.3}>
                            <div className="space-y-2">
                              <Label className="text-slate-300 text-xs">Event Description</Label>
                              <Textarea
                                value={eventDescription}
                                onChange={(e) => setEventDescription(e.target.value)}
                                placeholder="e.g., A basketball game between Patrick Henry and Lincoln High School..."
                                rows={2}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20 resize-none text-sm"
                              />
                            </div>
                          </SlideUp>

                          <SlideUp delay={0.4}>
                            <div className="flex justify-end pt-2">
                              <motion.div
                                variants={buttonTapVariants}
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <Button
                                  onClick={handleNext}
                                  disabled={!eventDescription.trim()}
                                  className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg flex items-center gap-2 text-sm px-4 py-2 h-8"
                                >
                                  Next
                                  <motion.div
                                    animate={{ x: eventDescription.trim() ? [0, 4, 0] : 0 }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                  >
                                    <ArrowRight className="h-3 w-3" />
                                  </motion.div>
                                </Button>
                              </motion.div>
                            </div>
                          </SlideUp>
                        </CardContent>
                      </Card>
                    </motion.div>

                    {/* Step 2: Additional Information */}
                    <motion.div 
                      className="w-full flex-shrink-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: step === 2 ? 1 : 0.5 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="bg-slate-700/50 backdrop-blur border-slate-600 shadow-lg">
                        <CardContent className="p-4 space-y-3">
                          <SlideUp delay={0.2}>
                            <div className="text-center mb-3">
                              <h3 className="text-sm font-medium text-white mb-1">
                                Anything else?
                              </h3>
                              <p className="text-slate-400 text-xs">
                                Add any additional details (optional)
                              </p>
                            </div>
                          </SlideUp>
                          
                          <SlideUp delay={0.3}>
                            <div className="space-y-2">
                              <Label className="text-slate-300 text-xs">Additional Information</Label>
                              <Textarea
                                value={additionalInfo}
                                onChange={(e) => setAdditionalInfo(e.target.value)}
                                placeholder="e.g., championship game, food trucks, special guests..."
                                rows={2}
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20 resize-none text-sm"
                              />
                            </div>
                          </SlideUp>

                          <SlideUp delay={0.4}>
                            <div className="flex justify-between pt-2">
                              <motion.div
                                variants={buttonTapVariants}
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <Button
                                  onClick={() => setStep(1)}
                                  variant="outline"
                                  className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-blue-400 text-sm px-4 py-2 h-8"
                                >
                                  Back
                                </Button>
                              </motion.div>
                              
                              <motion.div
                                variants={buttonTapVariants}
                                initial="rest"
                                whileHover="hover"
                                whileTap="tap"
                              >
                                <Button
                                  onClick={handleGenerate}
                                  disabled={isGenerating}
                                  className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg flex items-center gap-2 text-sm px-4 py-2 h-8"
                                >
                                  <AnimatePresence mode="wait">
                                    {isGenerating ? (
                                      <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-2"
                                      >
                                        <motion.div
                                          animate={{ rotate: 360 }}
                                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                          <Loader2 className="h-3 w-3" />
                                        </motion.div>
                                        Generating...
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        key="generate"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-2"
                                      >
                                        Generate
                                        <motion.div
                                          animate={{ rotate: [0, 360] }}
                                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        >
                                          <ArrowRight className="h-3 w-3" />
                                        </motion.div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </Button>
                              </motion.div>
                            </div>
                          </SlideUp>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                </div>

                {/* Step Indicator */}
                <motion.div 
                  className="flex justify-center mt-4 space-x-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {[1, 2].map((stepNum) => (
                    <motion.div
                      key={stepNum}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        step === stepNum ? "bg-blue-400" : "bg-slate-600"
                      }`}
                      animate={{
                        scale: step === stepNum ? [1, 1.2, 1] : 1,
                        backgroundColor: step === stepNum ? "#60a5fa" : "#475569"
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
} 