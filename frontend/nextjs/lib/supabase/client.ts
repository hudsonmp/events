import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_PUBLIC!
  )
}

// Enhanced caching system
const ensuredUsers = new Set<string>()
const apiCache = new Map<string, { data: any, timestamp: number, ttl: number }>()

// Generic cache helper
function getCachedData<T>(key: string): T | null {
  const cached = apiCache.get(key)
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data as T
  }
  apiCache.delete(key) // Clean up expired entries
  return null
}

function setCachedData(key: string, data: any, ttl: number = 30000) {
  apiCache.set(key, { data, timestamp: Date.now(), ttl })
}

// Optimized user existence check with multiple cache layers
async function ensureUserExists(userId: string) {
  // Cache layer 1: In-memory set for immediate checks
  if (ensuredUsers.has(userId)) {
    return { error: null }
  }

  // Cache layer 2: Timed cache with TTL
  const cacheKey = `user-exists-${userId}`
  const cachedResult = getCachedData<{ error: null }>(cacheKey)
  if (cachedResult) {
    ensuredUsers.add(userId) // Also update the set cache
    return cachedResult
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

    // Cache success result for 5 minutes
    const result = { error: null }
    ensuredUsers.add(userId)
    setCachedData(cacheKey, result, 300000) // 5 minutes
    return result
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
  const cacheKey = `rsvp-status-${eventId}-${userId}`
  const cached = getCachedData<{ isRsvpd: boolean, error: any }>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('event_attendees')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  const result = { isRsvpd: !!data && !error, error }
  // Cache for 30 seconds - RSVP status changes frequently
  setCachedData(cacheKey, result, 30000)
  return result
}

export async function getRsvpCount(eventId: string) {
  const cacheKey = `rsvp-count-${eventId}`
  const cached = getCachedData<{ count: number, error: any }>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { count, error } = await supabase
    .from('event_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  const result = { count: count || 0, error }
  // Cache for 10 seconds - count changes frequently but can be slightly stale
  setCachedData(cacheKey, result, 10000)
  return result
}
