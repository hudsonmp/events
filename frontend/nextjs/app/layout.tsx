import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { Toaster } from "@/components/ui/sonner"
import { Navigation } from "@/components/navigation"
import { JoinClubFAB } from "@/components/join-club-fab"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PHHS Events",
  description: "Discover events at Patrick Henry High School.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="light">
      <body className={cn("min-h-screen bg-white font-sans antialiased", inter.className)}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 max-w-screen-2xl items-center">
                <div className="mr-4 flex">
                  <Link href="/" className="mr-6 flex items-center space-x-2">
                    <span className="text-2xl font-bold logo-gradient">
                      PHHS Events
                    </span>
                  </Link>
                </div>
                <Navigation />
              </div>
            </header>
            <main className="flex-1">{children}</main>
          </div>
          <JoinClubFAB />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
