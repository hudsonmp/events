import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLIC!
  )
}

// Cache to track users we've already ensured exist
const ensuredUsers = new Set<string>()

// Helper function to ensure user exists in public.users table
async function ensureUserExists(userId: string) {
  // If we've already ensured this user exists, skip the API call
  if (ensuredUsers.has(userId)) {
    return { error: null }
  }
  try {
    const response = await fetch('/api/ensure-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })

         if (!response.ok) {
       const errorData = await response.json()
       console.error('Error ensuring user exists:', errorData.error)
       return { error: { message: errorData.error } }
     }

     // Add user to cache after successful creation/verification
     ensuredUsers.add(userId)
     return { error: null }
  } catch (error) {
    console.error('Error calling ensure-user API:', error)
    return { error: { message: 'Failed to ensure user exists' } }
  }
}

// RSVP service functions
export async function rsvpToEvent(eventId: string, userId: string) {
  const supabase = createClient()
  
  // Ensure user exists in public.users table first
  const { error: userError } = await ensureUserExists(userId)
  if (userError) {
    return { data: null, error: userError }
  }
  
  const { data, error } = await supabase
    .from('event_attendees')
    .insert({
      event_id: eventId,
      user_id: userId
    })
    .select()

  return { data, error }
}

export async function cancelRsvp(eventId: string, userId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)

  return { error }
}

export async function checkRsvpStatus(eventId: string, userId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('event_attendees')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  return { isRsvpd: !!data && !error, error }
}

export async function getRsvpCount(eventId: string) {
  const supabase = createClient()
  
  const { count, error } = await supabase
    .from('event_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  return { count: count || 0, error }
}
