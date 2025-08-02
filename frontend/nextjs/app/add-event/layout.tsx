import type React from "react"
import { Inter } from "next/font/google"
import "../globals.css"
import { cn } from "@/lib/utils"
import { AuthProvider } from "@/lib/contexts/auth-context"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export default function AddEventLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans antialiased overflow-hidden", inter.className)}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
} 