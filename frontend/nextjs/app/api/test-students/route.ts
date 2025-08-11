import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    
    const supabase = await createServerClient()
    
    // Test different query approaches
    const results = await Promise.all([
      // Test 1: Basic select all
      supabase
        .from('students')
        .select('id, username, name, processed')
        .limit(5),
      
      // Test 2: Search with ilike
      supabase
        .from('students')
        .select('id, username, name, processed')
        .ilike('username', `%${query}%`)
        .eq('processed', true)
        .limit(10),
      
      // Test 3: Search with or condition
      supabase
        .from('students')
        .select('id, username, name, processed')
        .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
        .eq('processed', true)
        .limit(10),
        
      // Test 4: Count total students
      supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true)
    ])

    return NextResponse.json({
      query,
      allStudents: results[0],
      usernameSearch: results[1],
      orSearch: results[2],
      totalCount: results[3].count
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

