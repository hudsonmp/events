import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { Toaster } from "@/components/ui/sonner"
import { ConditionalHeader } from "@/components/conditional-header"
import { BottomNavigation } from "@/components/navigation"
import { ExtensionGuardProvider } from "@/components/extension-guard-provider"
import Link from "next/link"
import { Home } from "lucide-react"


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
      <body className={cn("min-h-screen bg-white font-sans antialiased overflow-x-hidden", inter.className)} style={{ overscrollBehavior: 'none', scrollBehavior: 'auto' }} suppressHydrationWarning={true}>
        <ExtensionGuardProvider>
          <AuthProvider>
            <div className="bg-gradient-to-r from-green-600 to-yellow-500 text-white text-center py-1 text-sm font-medium relative">
              <div className="flex items-center justify-center">
                <Link 
                  href="/" 
                  className="absolute left-4 flex items-center gap-1 px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors duration-200"
                >
                  <Home size={14} />
                  <span className="text-xs font-medium">Home</span>
                </Link>
                <span>Happy 1st Day Patriots! 🎉</span>
              </div>
            </div>
            <div className="relative flex min-h-screen flex-col">
              <ConditionalHeader />
              <main className="flex-1 touch-pan-y pb-16 md:pb-0" style={{ overscrollBehavior: 'none' }}>{children}</main>
              <BottomNavigation />
            </div>
            <Toaster />
          </AuthProvider>
        </ExtensionGuardProvider>
      </body>
    </html>
  )
}
