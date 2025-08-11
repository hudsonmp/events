'use client'

import { useEffect } from 'react'

interface MeetingBookingProps {
  userName?: string
  userEmail?: string
  onBooked?: () => void
}

export default function MeetingBooking({ userName, userEmail, onBooked }: MeetingBookingProps) {
  useEffect(() => {
    // Load Cal.com embed script
    const script = document.createElement('script')
    script.src = 'https://app.cal.com/embed/embed.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4">Book a 15-minute setup with Hudson</h3>
      
      {/* Cal.com inline embed */}
      <div 
        className="w-full"
        dangerouslySetInnerHTML={{
          __html: `
            <cal-inline 
              data-cal-link="hudsonmp/henry-ai-club"
              data-cal-config='${JSON.stringify({
                name: userName || '',
                email: userEmail || '',
                theme: 'light',
                hideEventTypeDetails: false
              })}'
              style="width:100%;height:100%;overflow:scroll;min-height:450px"
            ></cal-inline>
          `
        }}
      />
      
      <div className="mt-4 text-sm text-gray-500 text-center">
        🎉 You'll leave with a week of plans ready to go!
      </div>
    </div>
  )
}
