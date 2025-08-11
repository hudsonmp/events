"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Calendar, Users, GraduationCap, Wand2 } from "lucide-react"
import { SafeMotionDiv } from "@/lib/motion-safe"

export default function HomePage() {
  const [typedText, setTypedText] = useState("")
  const fullText = "Henry AI Club"

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index + 1))
      index++
      if (index === fullText.length) clearInterval(interval)
    }, 70)
    return () => clearInterval(interval)
  }, [])

  const cards = [
    {
      href: "/build",
      title: "Build",
      description: "Describe an idea, and our AI will make it real in minutes.",
      icon: Wand2,
      color: "from-emerald-500/15 to-amber-400/15",
    },
    {
      href: "/events",
      title: "Events",
      description: "See everything happening at Henry in one feed.",
      icon: Calendar,
      color: "from-emerald-500/15 to-emerald-400/15",
    },
    {
      href: "/teachers",
      title: "Teachers",
      description: "Teachers and staff, this is for you! We want to use AI to make your life easier.",
      icon: GraduationCap,
      color: "from-amber-400/15 to-emerald-400/15",
    },
    {
      href: "/schedule",
      title: "Schedule",
      description: "Share and compare class schedules with friends.",
      icon: Users,
      color: "from-amber-400/15 to-amber-300/15",
    },
  ] as const

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient/Blob Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-400 blur-3xl opacity-30 mix-blend-multiply animate-blob animate-hue"></div>
        <div className="absolute top-1/3 -right-20 h-[28rem] w-[28rem] rounded-full bg-amber-300 blur-3xl opacity-30 mix-blend-multiply animate-blob animation-delay-2000 animate-hue"></div>
        <div className="absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-emerald-300 blur-3xl opacity-30 mix-blend-multiply animate-blob animation-delay-4000 animate-hue"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
        {/* Hero */}
        <SafeMotionDiv
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            <span className="logo-gradient">{typedText}</span>
            <span className="border-r-2 border-emerald-600 ml-1 align-middle animate-pulse" />
          </h1>
          <p className="mt-4 text-lg md:text-2xl text-slate-600">
            Four tools. One hub. Powered by AI.
          </p>
          <p className="mt-2 text-sm md:text-base text-slate-500">Choose your tool ↓</p>
        </SafeMotionDiv>

        {/* Tools Grid */}
        <div className="mt-10 grid grid-cols-1 gap-5 md:mt-14 md:grid-cols-2">
          {cards.map(({ href, title, description, icon: Icon, color }, idx) => (
            <Link key={title} href={href} className="group">
              <SafeMotionDiv
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * idx }}
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative overflow-hidden rounded-2xl border bg-white/70 p-6 shadow-sm backdrop-blur-md transition-all duration-300 hover:shadow-xl`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative flex items-start gap-4">
                  <SafeMotionDiv
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                    className="grid h-12 w-12 place-items-center rounded-xl bg-white/80 shadow ring-1 ring-black/5"
                  >
                    <Icon className="h-6 w-6 text-emerald-600" />
                  </SafeMotionDiv>
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900">{title}</CardTitle>
                    <CardDescription className="mt-1 text-slate-600">{description}</CardDescription>
                  </div>
                </div>
              </SafeMotionDiv>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}