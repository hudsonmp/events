'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/contexts/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Event, EventAttendee } from '@/lib/types'
import { EventCard } from '@/components/event-card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { isUpcoming } from '@/lib/utils'
import { Calendar, Users, AlertCircle } from 'lucide-react'

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth()
  const [events, setEvents] = useState<(EventAttendee & { event: Event })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserEvents()
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchUserEvents = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('event_attendees')
        .select(`
          event_id,
          user_id,
          event:events (
            id,
            name,
            description,
            start_datetime,
            end_datetime,
            is_all_day,
            location_name,
            address,
            url,
            type,
            status,
            created_at,
            updated_at,
            school_id,
            profile_id,
            post_id,
            caption_id
          )
        `)
        .eq('user_id', user?.id)
        .order('event(start_datetime)', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      setEvents(data as (EventAttendee & { event: Event })[])
    } catch (err) {
      console.error('Error fetching user events:', err)
      setError('Failed to load your events. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (eventId: string, action: 'join' | 'leave') => {
    if (!user) return

    try {
      if (action === 'join') {
        const { error } = await supabase
          .from('event_attendees')
          .insert([{ event_id: eventId, user_id: user.id }])

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id)

        if (error) throw error
      }

      // Refresh the events list
      await fetchUserEvents()
    } catch (err) {
      console.error('Error updating RSVP:', err)
      setError('Failed to update RSVP. Please try again.')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading your events...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5" />
              Sign In Required
            </CardTitle>
            <CardDescription>
              Please sign in to view your events and RSVPs.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const upcomingEvents = events.filter(({ event }) => 
    event.start_datetime ? isUpcoming(event.start_datetime) : false
  )
  const pastEvents = events.filter(({ event }) => 
    event.start_datetime ? !isUpcoming(event.start_datetime) : true
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            My Events
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your event RSVPs and view your upcoming and past events.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming ({upcomingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Past ({pastEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Events</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't RSVP'd to any upcoming events yet.
                  </p>
                  <Button onClick={() => window.location.href = '/events'}>
                    Browse Events
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingEvents.map(({ event }) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    showRSVPButton={true}
                    onRSVP={handleRSVP}
                    isAttending={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastEvents.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Past Events</h3>
                  <p className="text-muted-foreground">
                    You haven't attended any events yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastEvents.map(({ event }) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    showRSVPButton={false}
                    isAttending={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}