import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { Toaster } from "@/components/ui/sonner"
import { ConditionalHeader } from "@/components/conditional-header"
import { BottomNavigation } from "@/components/navigation"


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
      <body className={cn("min-h-screen bg-white font-sans antialiased overflow-x-hidden", inter.className)} style={{ overscrollBehavior: 'none', scrollBehavior: 'auto' }}>
        <AuthProvider>
          <div className="relative flex min-h-screen flex-col">
            <ConditionalHeader />
            <main className="flex-1 touch-pan-y pb-16 md:pb-0" style={{ overscrollBehavior: 'none' }}>{children}</main>
            <BottomNavigation />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
