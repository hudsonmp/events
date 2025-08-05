"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { type User, type AuthContextType } from "@/lib/types"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    // Build the redirect URL dynamically so that it works across
    // desktop and mobile browsers, in both development and production.
    // We avoid environment-specific branching based on NODE_ENV because
    // some mobile browsers (e.g. iOS standalone/PWA) can still return
    // unexpected hostnames. Instead we rely on the actual origin that
    // the user is visiting.
    // Mobile browsers sometimes mis-handle window.location during the OAuth
    // round-trip (especially iOS in-app WebViews), which can result in an
    // incorrect `redirect_to` being sent (e.g. pointing to localhost). To make
    // the flow completely deterministic we _always_ send the production URL.
    // This is safe because Supabase ignores the `redirect_to` domain mismatch
    // in local development when you use the `http://localhost:3000` site.
    const getRedirectUrl = () => "https://henryai.org/auth/callback"

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
      },
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value: AuthContextType = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 