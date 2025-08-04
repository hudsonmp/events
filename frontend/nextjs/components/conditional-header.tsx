"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Navigation } from "@/components/navigation"

export function ConditionalHeader() {
  const pathname = usePathname()
  
  // Hide header on add-event page
  if (pathname === "/add-event") {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm shadow-sm transition-all duration-100 ease-out hidden md:block">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="text-2xl font-bold logo-gradient transition-transform duration-100 hover:scale-105">
              PHHS Events
            </span>
          </Link>
        </div>
        <Navigation />
      </div>
    </header>
  )
}