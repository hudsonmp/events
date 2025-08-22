"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/contexts/auth-context"
import { AddEventForm } from "@/components/add-event-form"
import { Navigation } from "@/components/navigation"

export default function AddEventPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/events")
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated (this will be handled by useEffect)
  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-slate-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Menu Button - Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <Navigation />
      </div>
      
      <AddEventForm />
    </div>
  )
} 