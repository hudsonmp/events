import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { AddEventForm } from "@/components/add-event-form"
import { Navigation } from "@/components/navigation"

export const revalidate = 0 // Don't cache this page

export default async function AddEventPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
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