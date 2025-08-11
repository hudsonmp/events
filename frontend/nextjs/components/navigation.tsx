"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
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
import { User, Calendar, LogOut, Users, Plus, Ticket, CalendarPlus, Menu, X, Search, Home, CalendarCheck, TrendingUp } from "lucide-react"
import { SafeMotionDiv, SafeAnimatePresence, buttonTapVariants } from "@/lib/motion-safe"

export function Navigation() {
  const { user, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin")


  const handleSignOut = async () => {
    await signOut()
  }

  const openAuthModal = (tab: "signin" | "signup") => {
    setAuthTab(tab)
    setShowAuthModal(true)
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-4">
        <SafeMotionDiv
          variants={buttonTapVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <Link href="/events">
            <Button variant="ghost" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
              <TrendingUp className="h-4 w-4" />
              Trending
            </Button>
          </Link>
        </SafeMotionDiv>

        <SafeMotionDiv
          variants={buttonTapVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <Link href="/events/find-events">
            <Button variant="ghost" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
              <Search className="h-4 w-4" />
              Find Events
            </Button>
          </Link>
        </SafeMotionDiv>

        <SafeMotionDiv
          variants={buttonTapVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <Link href="/events/my-events">
            <Button variant="ghost" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
              <Calendar className="h-4 w-4" />
              My Events
            </Button>
          </Link>
        </SafeMotionDiv>

        {user ? (
          <div className="flex items-center gap-3">
            <SafeMotionDiv
              variants={buttonTapVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <Link href="/events/add-event">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              </Link>
            </SafeMotionDiv>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SafeMotionDiv
                  variants={buttonTapVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="h-4 w-4" />
                  </Button>
                </SafeMotionDiv>
              </DropdownMenuTrigger>
              
              <SafeAnimatePresence>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 border-slate-200 shadow-lg"
                  asChild
                >
                  <SafeMotionDiv
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div>
                      <SafeMotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 }}
                      >
                        <DropdownMenuItem className="flex flex-col items-start p-3">
                          <div className="font-medium text-slate-800">
                            {user.user_metadata?.full_name || user.email}
                          </div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </DropdownMenuItem>
                      </SafeMotionDiv>
                      
                      <DropdownMenuSeparator />
                      
                      <SafeMotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <DropdownMenuItem asChild>
                          <Link href="/events/my-events" className="cursor-pointer">
                            <Calendar className="mr-2 h-4 w-4" />
                            My Events
                          </Link>
                        </DropdownMenuItem>
                      </SafeMotionDiv>
                      
                      <SafeMotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                      >
                        <DropdownMenuItem asChild>
                          <Link href="/events/add-event" className="cursor-pointer">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Event
                          </Link>
                        </DropdownMenuItem>
                      </SafeMotionDiv>
                      
                      <DropdownMenuSeparator />
                      
                      <SafeMotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Sign Out
                        </DropdownMenuItem>
                      </SafeMotionDiv>
                    </div>
                  </SafeMotionDiv>
                </DropdownMenuContent>
              </SafeAnimatePresence>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <SafeMotionDiv
              variants={buttonTapVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <Button 
                variant="ghost" 
                onClick={() => openAuthModal("signin")}
                className="text-slate-600 hover:text-slate-800"
              >
                Sign In
              </Button>
            </SafeMotionDiv>
            
            <SafeMotionDiv
              variants={buttonTapVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <Button 
                onClick={() => openAuthModal("signup")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Sign Up
              </Button>
            </SafeMotionDiv>
          </div>
        )}
      </div>



      {/* Auth Modal */}
      <SafeAnimatePresence>
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            defaultTab={authTab}
          />
        )}
      </SafeAnimatePresence>
    </>
  )
}

export function BottomNavigation() {
  const { user, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin")
  const pathname = usePathname()

  // Only show bottom navigation on /events routes
  if (!pathname.startsWith("/events")) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const openAuthModal = (tab: "signin" | "signup") => {
    setAuthTab(tab)
    setShowAuthModal(true)
  }

  return (
    <>
      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
        <div className="flex items-center justify-around px-4 py-2 pb-safe">
          {/* Home */}
          <SafeMotionDiv
            variants={buttonTapVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="flex-1"
          >
            <Link href="/events" className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors hover:bg-gray-50">
              <TrendingUp className="h-5 w-5 text-slate-600 mb-1" />
              <span className="text-xs text-slate-600 font-medium">Trending</span>
            </Link>
          </SafeMotionDiv>

          {/* Find Events */}
          <SafeMotionDiv
            variants={buttonTapVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="flex-1"
          >
            <Link href="/events/find-events" className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors hover:bg-gray-50">
              <Calendar className="h-5 w-5 text-slate-600 mb-1" />
              <span className="text-xs text-slate-600 font-medium">Find</span>
            </Link>
          </SafeMotionDiv>

          {/* My Events */}
          <SafeMotionDiv
            variants={buttonTapVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="flex-1"
          >
            <Link href="/events/my-events" className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors hover:bg-gray-50">
              <CalendarCheck className="h-5 w-5 text-slate-600 mb-1" />
              <span className="text-xs text-slate-600 font-medium">My Events</span>
            </Link>
          </SafeMotionDiv>

          {/* Add Event (if user is logged in) */}
          {user && (
            <SafeMotionDiv
              variants={buttonTapVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="flex-1"
            >
              <Link href="/events/add-event" className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors hover:bg-gray-50">
                <div className="bg-emerald-600 rounded-full p-1 mb-1">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs text-emerald-600 font-medium">Add</span>
              </Link>
            </SafeMotionDiv>
          )}

          {/* Profile / Auth */}
          <SafeMotionDiv
            variants={buttonTapVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="flex-1"
          >
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors hover:bg-gray-50 cursor-pointer">
                    <User className="h-5 w-5 text-slate-600 mb-1" />
                    <span className="text-xs text-slate-600 font-medium">Profile</span>
                  </div>
                </DropdownMenuTrigger>
                
                <SafeAnimatePresence>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-56 border-slate-200 shadow-lg mb-2"
                    asChild
                  >
                    <SafeMotionDiv
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      <div>
                        <SafeMotionDiv
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 }}
                        >
                          <DropdownMenuItem className="flex flex-col items-start p-3">
                            <div className="font-medium text-slate-800">
                              {user.user_metadata?.full_name || user.email}
                            </div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </DropdownMenuItem>
                        </SafeMotionDiv>
                        
                        <DropdownMenuSeparator />
                        
                        <SafeMotionDiv
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.1 }}
                        >
                          <DropdownMenuItem asChild>
                            <Link href="/events/my-events" className="cursor-pointer">
                              <Calendar className="mr-2 h-4 w-4" />
                              My Events
                            </Link>
                          </DropdownMenuItem>
                        </SafeMotionDiv>
                        
                        <SafeMotionDiv
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.15 }}
                        >
                          <DropdownMenuItem asChild>
                            <Link href="/events/add-event" className="cursor-pointer">
                              <Plus className="mr-2 h-4 w-4" />
                              Add Event
                            </Link>
                          </DropdownMenuItem>
                        </SafeMotionDiv>
                        
                        <DropdownMenuSeparator />
                        
                        <SafeMotionDiv
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={handleSignOut}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                          </DropdownMenuItem>
                        </SafeMotionDiv>
                      </div>
                    </SafeMotionDiv>
                  </DropdownMenuContent>
                </SafeAnimatePresence>
              </DropdownMenu>
            ) : (
              <div 
                onClick={() => openAuthModal("signin")}
                className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors hover:bg-gray-50 cursor-pointer"
              >
                <User className="h-5 w-5 text-slate-600 mb-1" />
                <span className="text-xs text-slate-600 font-medium">Login</span>
              </div>
            )}
          </SafeMotionDiv>
        </div>
      </div>

      {/* Auth Modal */}
      <SafeAnimatePresence>
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            defaultTab={authTab}
          />
        )}
      </SafeAnimatePresence>
    </>
  )
} 