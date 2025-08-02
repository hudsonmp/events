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
import { User, Calendar, LogOut, Users, Plus, Ticket, CalendarPlus, Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { buttonTapVariants, slideDownVariants, FadeIn } from "@/lib/motion"

export function Navigation() {
  const { user, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin")
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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
        <motion.div
          variants={buttonTapVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <Link href="/my-events">
            <Button variant="ghost" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
              <Calendar className="h-4 w-4" />
              My Events
            </Button>
          </Link>
        </motion.div>

        {user ? (
          <div className="flex items-center gap-3">
            <motion.div
              variants={buttonTapVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
            >
              <Link href="/add-event">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Event
                </Button>
              </Link>
            </motion.div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  variants={buttonTapVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button variant="ghost" size="icon" className="relative">
                    <User className="h-4 w-4" />
                  </Button>
                </motion.div>
              </DropdownMenuTrigger>
              
              <AnimatePresence>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 border-slate-200 shadow-lg"
                  asChild
                >
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div>
                      <motion.div
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
                      </motion.div>
                      
                      <DropdownMenuSeparator />
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <DropdownMenuItem asChild>
                          <Link href="/my-events" className="cursor-pointer">
                            <Calendar className="mr-2 h-4 w-4" />
                            My Events
                          </Link>
                        </DropdownMenuItem>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                      >
                        <DropdownMenuItem asChild>
                          <Link href="/add-event" className="cursor-pointer">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Event
                          </Link>
                        </DropdownMenuItem>
                      </motion.div>
                      
                      <DropdownMenuSeparator />
                      
                      <motion.div
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
                      </motion.div>
                    </div>
                  </motion.div>
                </DropdownMenuContent>
              </AnimatePresence>
            </DropdownMenu>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <motion.div
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
            </motion.div>
            
            <motion.div
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
            </motion.div>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden flex items-center gap-2">
        <motion.div
          variants={buttonTapVariants}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="relative z-50"
          >
            <AnimatePresence mode="wait">
              {showMobileMenu ? (
                <motion.div
                  key="close"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setShowMobileMenu(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, x: "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 md:hidden"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <motion.div 
                  className="p-6 border-b border-slate-200"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-lg font-semibold text-slate-800">Menu</h2>
                </motion.div>

                {/* Navigation Items */}
                <div className="flex-1 p-6 space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Link 
                      href="/my-events"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Calendar className="h-5 w-5 text-slate-600" />
                      <span className="text-slate-800 font-medium">My Events</span>
                    </Link>
                  </motion.div>

                  {user && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Link 
                        href="/add-event"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Plus className="h-5 w-5 text-slate-600" />
                        <span className="text-slate-800 font-medium">Add Event</span>
                      </Link>
                    </motion.div>
                  )}
                </div>

                {/* Footer */}
                <motion.div 
                  className="p-6 border-t border-slate-200 space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {user ? (
                    <>
                      <div className="mb-4">
                        <div className="font-medium text-slate-800">
                          {user.user_metadata?.full_name || user.email}
                        </div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                      <Button
                        onClick={() => {
                          handleSignOut()
                          setShowMobileMenu(false)
                        }}
                        variant="outline"
                        className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Button 
                        onClick={() => {
                          openAuthModal("signin")
                          setShowMobileMenu(false)
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Sign In
                      </Button>
                      <Button 
                        onClick={() => {
                          openAuthModal("signup")
                          setShowMobileMenu(false)
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        Sign Up
                      </Button>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            defaultTab={authTab}
          />
        )}
      </AnimatePresence>
    </>
  )
} 