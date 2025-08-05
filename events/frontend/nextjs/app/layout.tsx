import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/contexts/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Events App - My Events',
  description: 'Manage your event RSVPs and discover new events',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container mx-auto px-4 py-4">
                <nav className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold">Events App</h1>
                  </div>
                  <div className="flex items-center space-x-4">
                    <a href="/my-events" className="text-sm font-medium hover:underline">
                      My Events
                    </a>
                    <a href="/events" className="text-sm font-medium hover:underline">
                      Browse Events
                    </a>
                  </div>
                </nav>
              </div>
            </header>
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}