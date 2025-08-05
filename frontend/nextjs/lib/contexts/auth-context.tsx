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
    // Get the correct redirect URL based on environment
    const getRedirectUrl = () => {
      if (typeof window !== 'undefined') {
        const { protocol, hostname, port } = window.location
        
        // Check if we're in development (localhost or 127.0.0.1)
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
        const isDevelopment = process.env.NODE_ENV === 'development' || isLocalhost
        
        if (isDevelopment) {
          // Use the current origin for development
          const portSuffix = port ? `:${port}` : ''
          return `${protocol}//${hostname}${portSuffix}/auth/callback`
        }
        
        // For production, use the current origin (works for any domain)
        return `${window.location.origin}/auth/callback`
      }
      
      // Fallback for SSR or if window is undefined
      return process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000/auth/callback'
        : 'https://henryai.org/auth/callback'
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