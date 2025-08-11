'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, Sparkles, Zap, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface ScheduleUploadProps {
  onUploadComplete: (imageUrl: string) => void
  isProcessing: boolean
}

export default function ScheduleUpload({ onUploadComplete, isProcessing }: ScheduleUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string
        const base64Image = base64Data.split(',')[1] // Remove data:image/jpeg;base64, prefix
        
        // Show upload progress
        let progress = 0
        const uploadInterval = setInterval(() => {
          progress += Math.random() * 30
          setUploadProgress(Math.min(progress, 90))
        }, 200)

        try {
          // Call the parse API
          const response = await fetch('/api/parse-schedule', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ imageBase64: base64Image })
          })

          if (!response.ok) {
            throw new Error('Failed to parse schedule')
          }

          clearInterval(uploadInterval)
          setUploadProgress(100)

          // Create URL for the uploaded image and complete
          const imageUrl = URL.createObjectURL(file)
          onUploadComplete(imageUrl)

        } catch (error) {
          clearInterval(uploadInterval)
          console.error('Error parsing schedule:', error)
          // Still complete with the image for demo purposes
          const imageUrl = URL.createObjectURL(file)
          onUploadComplete(imageUrl)
        }
      }
      
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error processing file:', error)
    }
  }, [onUploadComplete])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.heic']
    },
    maxFiles: 1,
    noClick: true
  })

  // Simulate processing steps
  React.useEffect(() => {
    if (isProcessing) {
      const steps = [
        'Reading your schedule...',
        'Extracting class periods...',
        'Identifying teachers...',
        'Formatting schedule...',
        'Almost done...'
      ]
      
      steps.forEach((step, index) => {
        setTimeout(() => {
          setProcessingStep(step)
        }, index * 600)
      })
    }
  }, [isProcessing])

  if (isProcessing) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-yellow-50">
          <CardContent className="p-8 text-center">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity }
              }}
              className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">AI is working its magic ✨</h3>
            <p className="text-gray-600 mb-6">{processingStep}</p>

            <div className="space-y-3">
              <Progress value={33} className="w-full" />
              <div className="flex justify-center space-x-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{
                      y: [0, -10, 0],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.3
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">This usually takes 2-3 seconds</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Main Upload Area */}
      <motion.div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 cursor-pointer
          ${dragActive || isDragActive 
            ? 'border-green-400 bg-green-50 scale-105' 
            : 'border-gray-300 bg-white hover:border-green-300 hover:bg-green-25'
          }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input {...getInputProps()} />
        
        <div className="text-center space-y-4">
          <motion.div
            animate={{ 
              y: dragActive ? -5 : 0,
              rotate: dragActive ? 5 : 0
            }}
            className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors
              ${dragActive ? 'bg-green-500' : 'bg-gray-100'}`}
          >
            <Upload className={`h-8 w-8 ${dragActive ? 'text-white' : 'text-gray-400'}`} />
          </motion.div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Drop your schedule screenshot
            </h3>
            <p className="text-sm text-gray-500">
              or tap to browse your photos
            </p>
          </div>

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-gray-500">Uploading... {Math.round(uploadProgress)}%</p>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: dragActive ? 1 : 0 }}
          className="absolute inset-0 bg-green-100 border-2 border-green-400 rounded-2xl flex items-center justify-center"
        >
          <div className="text-center">
            <Zap className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-medium">Drop it like it's hot! 🔥</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={open}
          variant="outline"
          className="h-12 border-gray-200 hover:border-green-300 hover:bg-green-50"
        >
          <Upload className="h-4 w-4 mr-2" />
          Browse Photos
        </Button>
        
        <Button
          onClick={() => {
            // Trigger camera input
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.capture = 'environment' // Use back camera
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) {
                await onDrop([file])
              }
            }
            input.click()
          }}
          className="h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600"
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </Button>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Pro Tips for Best Results:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Make sure all text is clearly visible</li>
              <li>• Include teacher names and room numbers</li>
              <li>• Good lighting helps our AI read better</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sample Preview */}
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-2">Example of what we're looking for:</p>
        <div className="bg-gray-100 border rounded-lg p-3 text-xs">
          <div className="grid grid-cols-4 gap-2 font-medium text-gray-700">
            <div>Period</div>
            <div>Time</div>
            <div>Subject</div>
            <div>Teacher</div>
          </div>
          <div className="border-t border-gray-200 mt-1 pt-1 grid grid-cols-4 gap-2 text-gray-600">
            <div>1</div>
            <div>8:00-8:50</div>
            <div>Physics</div>
            <div>Mr. Smith</div>
          </div>
        </div>
      </div>
    </div>
  )
}
