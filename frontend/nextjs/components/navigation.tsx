"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/auth-modal"
import { useAuth } from "@/lib/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Calendar, LogOut, Users } from "lucide-react"

export function Navigation() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin")
  const { user, loading, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  const openAuthModal = (tab: "signin" | "signup") => {
    setAuthModalTab(tab)
    setAuthModalOpen(true)
  }

  return (
    <>
      <nav className="flex items-center space-x-6 text-sm font-medium flex-1">
        <Link href="/" className="transition-colors hover:text-foreground/80 text-foreground/60">
          Events
        </Link>
        {user && (
          <Link href="/my-events" className="transition-colors hover:text-foreground/80 text-foreground/60">
            My Events
          </Link>
        )}
      </nav>

      <div className="flex items-center space-x-2">
        {loading ? (
          <div className="h-8 w-16 bg-slate-200 animate-pulse rounded" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  {user.user_metadata?.full_name && (
                    <p className="w-[200px] truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/my-events" className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  My Events
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => openAuthModal("signin")}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => openAuthModal("signup")}>
              Sign Up
            </Button>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  )
} 