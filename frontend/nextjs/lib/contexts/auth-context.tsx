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
    // We prioritize the current window location for accuracy, then fall back
    // to environment-specific configuration.
    const getRedirectUrl = () => {
      // First priority: Use the actual origin the user is visiting
      if (typeof window !== "undefined") {
        const origin = window.location.origin
        console.log(`🔐 Auth redirect using window.location.origin: ${origin}/auth/callback`)
        return `${origin}/auth/callback`
      }
      
      // Second priority: Check if we're in development mode
      if (process.env.NODE_ENV === "development") {
        const devUrl = "http://localhost:3000/auth/callback"
        console.log(`🔐 Auth redirect using development fallback: ${devUrl}`)
        return devUrl
      }
      
      // Third priority: Use environment variable
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        const envUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        console.log(`🔐 Auth redirect using NEXT_PUBLIC_SITE_URL: ${envUrl}`)
        return envUrl
      }
      
      // Final fallback: Production URL
      const prodUrl = "https://henryai.org/auth/callback"
      console.log(`🔐 Auth redirect using production fallback: ${prodUrl}`)
      return prodUrl
    }

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