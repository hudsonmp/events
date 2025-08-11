"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/contexts/auth-context"
import { OnboardingModal } from "@/components/onboarding-modal"
import { toast } from "sonner"
import { Mail, Eye, EyeOff } from "lucide-react"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: "signin" | "signup"
}

export function AuthModal({ isOpen, onClose, defaultTab = "signin" }: AuthModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, showOnboarding, onboardingUserId, closeOnboarding } = useAuth()

  const handleEmailAuth = async (mode: "signin" | "signup") => {
    if (!email || !password) {
      toast.error("Please fill in all fields")
      return
    }

    setLoading(true)
    const { error } = mode === "signin" 
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password)

    if (error) {
      toast.error(error.message)
    } else {
      if (mode === "signin") {
        toast.success("Signed in successfully!")
        onClose()
        setEmail("")
        setPassword("")
      } else {
        // For signup, don't close modal yet - onboarding will handle it
        toast.success("Account created! Let's set up your profile.")
        setEmail("")
        setPassword("")
        // Auth modal will close when onboarding starts
        if (showOnboarding) {
          onClose()
        }
      }
    }
    setLoading(false)
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    const { error } = await signInWithGoogle()
    
    if (error) {
      toast.error(error.message)
      setLoading(false)
    }
    // Don't close modal for OAuth as user will be redirected
  }

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setShowPassword(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md border-none bg-gradient-to-br from-emerald-900 via-emerald-800 to-amber-800 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold bg-gradient-to-r from-emerald-100 to-amber-100 bg-clip-text text-transparent">
            Welcome to PHHS Events
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-emerald-950/50 border border-emerald-700/30">
            <TabsTrigger 
              value="signin" 
              onClick={resetForm}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-amber-600 data-[state=active]:text-white text-emerald-200 border-none"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              onClick={resetForm}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-amber-600 data-[state=active]:text-white text-emerald-200 border-none"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email" className="text-emerald-100">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-emerald-950/30 border-emerald-700/50 text-white placeholder:text-emerald-300/70 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password" className="text-emerald-100">Password</Label>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-emerald-950/30 border-emerald-700/50 text-white placeholder:text-emerald-300/70 focus:border-amber-500 focus:ring-amber-500/20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-emerald-800/50 text-emerald-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => handleEmailAuth("signin")} 
              className="w-full bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 text-white border-none shadow-lg"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-emerald-100">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="bg-emerald-950/30 border-emerald-700/50 text-white placeholder:text-emerald-300/70 focus:border-amber-500 focus:ring-amber-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-emerald-100">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="bg-emerald-950/30 border-emerald-700/50 text-white placeholder:text-emerald-300/70 focus:border-amber-500 focus:ring-amber-500/20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-emerald-800/50 text-emerald-200"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              onClick={() => handleEmailAuth("signup")} 
              className="w-full bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 text-white border-none shadow-lg"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-emerald-700/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-amber-800 px-2 text-emerald-200">
              Or continue with
            </span>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full bg-white/10 border-emerald-700/50 text-white hover:bg-white/20 hover:border-amber-500/50"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
        </DialogContent>
      </Dialog>

      {/* Onboarding Modal */}
      {showOnboarding && onboardingUserId && (
        <OnboardingModal
          isOpen={showOnboarding}
          onClose={closeOnboarding}
          userId={onboardingUserId}
        />
      )}
    </>
  )
} 