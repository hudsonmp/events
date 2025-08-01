"use client"

import Image from "next/image"
import { ExternalLink } from "lucide-react"

export function JoinClubFAB() {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href="https://classroom.google.com/c/NzQ3MDE0ODc4NzY2?cjc=sqc32yw"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 bg-gradient-to-r from-green-800 to-yellow-600 hover:from-green-900 hover:to-yellow-700 text-white px-6 py-4 rounded-full font-medium transition-all duration-300 shadow-2xl hover:shadow-3xl transform hover:scale-105 group"
        title="Join the Henry AI Club"
      >
        <Image
          src="/ai-club-logo.png"
          alt="Henry AI Club"
          width={28}
          height={28}
          className="w-7 h-7"
        />
        <span className="hidden sm:inline">Join the Club</span>
        <ExternalLink className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
      </a>
    </div>
  )
} 