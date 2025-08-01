export interface Event {
  id: string
  name: string
  description?: string
  start_datetime?: string
  end_datetime?: string
  is_all_day: boolean
  location_name?: string
  address?: string
  url?: string
  type: 'in-person' | 'virtual' | 'hybrid'
  status: 'draft' | 'published' | 'cancelled'
  created_at: string
  updated_at: string
  school_id: string
  profile_id?: string
  post_id?: string
  caption_id?: string
}

export interface EventAttendee {
  event_id: string
  user_id: string
  event: Event
}

export interface User {
  id: string
  school_id?: string
}

export interface Profile {
  id: string
  username: string
  full_name?: string
  bio?: string
  profile_pic_url?: string
  school_id: string
  is_verified: boolean
  is_private: boolean
  followers: number
  mediacount: number
  created_at: string
}

export interface School {
  id: string
  name: string
  address?: string
}