export type Event = {
  id: string
  name: string
  start_datetime: string | null
  end_datetime: string | null
  location_name: string | null
  address: string | null
  description: string | null
  is_all_day: boolean
  type: "in-person" | "virtual" | "hybrid"
  url: string | null
  status: "active" | "draft"
  categories: { category: { id: string; name: string } }[]
  tags: { tag: string }[]
  profile: {
    username: string
    profile_pic_url: string | null
    bio: string | null
  } | null
  school: {
    name: string
    address: string | null
  } | null
  post_images: {
    post_images: { file_path: string }[]
  } | null
  event_images: {
    image: { id: string; storage_path: string; url: string | null }
  }[] | null
}

export type PopularEvent = {
  event_id: string
  event_name: string
  start_datetime: string | null
  tag_count: number
  // We need to fetch the image separately for popular events
  post_images?: { file_path: string }[] | null
}

export type User = {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

export type AuthContextType = {
  user: User | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

export const CATEGORIES = ["event", "club", "sport", "deadline", "meeting"] as const
