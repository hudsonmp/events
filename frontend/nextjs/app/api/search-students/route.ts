import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addProfilePicUrls } from '@/lib/instagram-utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // avoid static caching

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  // Optional: short-circuit on empty
  if (!q) return NextResponse.json({ students: [] }, { headers: { 'Cache-Control': 'no-store' } });

  // Use service role key to bypass RLS since students table has no policies
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    console.log('Server-side searching for:', q);

    // Properly escape the search query
    const escapedQuery = q.replace(/[%_]/g, '\\$&');

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name:name, profile_pic_url')
      .or(`username.ilike.%${escapedQuery}%,full_name.ilike.%${escapedQuery}%`)
      .order('username')
      .limit(15);

    console.log('Server search results:', data?.length || 0, 'students found');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json({ students: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
