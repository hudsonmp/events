import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Use service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    )

    // Check if user exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    // If user doesn't exist, create them
    if (!existingUser) {
      const { error } = await supabase
        .from('users')
        .insert({ id: userId })

      if (error) {
        console.error('Error creating user in public.users:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ensure user API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 