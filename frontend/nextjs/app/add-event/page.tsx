import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { AddEventForm } from "@/components/add-event-form"
import Link from "next/link"
import { Navigation } from "@/components/navigation"

export const revalidate = 0 // Don't cache this page

export default async function AddEventPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Custom Header for Add Event Page */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-sm">
        <div className="container flex h-14 max-w-screen-2xl items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="text-2xl font-bold text-slate-100 transition-transform duration-100 hover:scale-105">
                PHHS Events
              </span>
            </Link>
          </div>
          <Navigation />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <AddEventForm />
      </div>
    </div>
  )
} 