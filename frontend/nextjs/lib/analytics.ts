// Simple analytics tracking for conversion funnel
// This is a basic implementation - in production you'd use Google Analytics, Mixpanel, etc.

interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: Date
}

class Analytics {
  private events: AnalyticsEvent[] = []
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.loadStoredEvents()
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private loadStoredEvents() {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem('henry-analytics-events')
      if (stored) {
        this.events = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load analytics events:', error)
    }
  }

  private saveEvents() {
    if (typeof window === 'undefined') return
    
    try {
      // Keep only last 100 events to prevent storage bloat
      const eventsToStore = this.events.slice(-100)
      localStorage.setItem('henry-analytics-events', JSON.stringify(eventsToStore))
    } catch (error) {
      console.error('Failed to save analytics events:', error)
    }
  }

  track(event: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        ...properties
      },
      timestamp: new Date()
    }

    this.events.push(analyticsEvent)
    this.saveEvents()

    // In production, you'd send this to your analytics service
    console.log('📊 Analytics:', analyticsEvent)
  }

  // Conversion funnel tracking methods
  trackPreChatView() {
    this.track('prechat_viewed')
  }

  trackPreChatComplete() {
    this.track('prechat_completed', {
      funnel_step: 1
    })
  }

  trackNameSubmitted(name: string) {
    this.track('name_submitted', {
      funnel_step: 2,
      name_length: name.length
    })
  }

  trackRoleSelected(role: string) {
    this.track('role_selected', {
      funnel_step: 3,
      role
    })
  }

  trackMessageSent(messageType: 'user' | 'ai', contentLength: number) {
    this.track('message_sent', {
      message_type: messageType,
      content_length: contentLength
    })
  }

  trackFinalPlanViewed(planTitle: string) {
    this.track('final_plan_viewed', {
      funnel_step: 4,
      plan_title: planTitle
    })
  }

  trackMeetingBookingOpened() {
    this.track('meeting_booking_opened', {
      funnel_step: 5
    })
  }

  trackMeetingBooked() {
    this.track('meeting_booked', {
      funnel_step: 6,
      conversion: true
    })
  }

  trackPlanTryNow(planTitle: string) {
    this.track('plan_try_now', {
      plan_title: planTitle
    })
  }

  trackPlanExpanded(planTitle: string) {
    this.track('plan_expanded', {
      plan_title: planTitle
    })
  }

  trackChangeRequested() {
    this.track('change_requested')
  }

  // Get analytics summary for debugging
  getSummary() {
    const eventCounts = this.events.reduce((acc, event) => {
      acc[event.event] = (acc[event.event] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      eventCounts,
      funnelProgress: this.getFunnelProgress()
    }
  }

  private getFunnelProgress() {
    const funnelSteps = [
      'prechat_viewed',
      'prechat_completed', 
      'name_submitted',
      'role_selected',
      'final_plan_viewed',
      'meeting_booking_opened',
      'meeting_booked'
    ]

    const progress = funnelSteps.map(step => ({
      step,
      completed: this.events.some(event => event.event === step)
    }))

    return progress
  }
}

// Singleton instance
export const analytics = new Analytics()

// Convenience function for React components
export const useAnalytics = () => analytics
