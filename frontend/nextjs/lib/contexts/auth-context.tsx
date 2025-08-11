"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { type User, type AuthContextType } from "@/lib/types"

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false) // Start as false - don't block initial render
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingUserId, setOnboardingUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    
    // Get initial session - non-blocking
    const getInitialSession = async () => {
      try {
        // Check local storage first for faster initial load
        const localSession = localStorage.getItem('sb-' + process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL?.split('//')[1]?.split('.')[0] + '-auth-token')
        
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          setUser(session?.user ?? null)
          if (loading) setLoading(false) // Only update if we were loading
        }
      } catch (error) {
        console.error('Error getting session:', error)
        if (mounted) {
          setUser(null)
          if (loading) setLoading(false)
        }
      }
    }

    // Don't block - get session in background
    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null)
          if (loading) setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase.auth, loading])

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    // If signup successful and user is created, trigger onboarding
    if (!error && data.user) {
      // Create user record in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          verified: false,
          joined_classroom: false
        })
      
      if (userError) {
        console.error('Error creating user record:', userError)
      }
      
      // Trigger onboarding modal
      setOnboardingUserId(data.user.id)
      setShowOnboarding(true)
    }
    
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

  const closeOnboarding = () => {
    setShowOnboarding(false)
    setOnboardingUserId(null)
  }

  const value: AuthContextType = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    showOnboarding,
    onboardingUserId,
    closeOnboarding,
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