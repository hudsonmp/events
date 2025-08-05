import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { eventId, userId, updates, images } = await request.json()

    if (!eventId || !userId) {
      return NextResponse.json({ error: 'Event ID and User ID are required' }, { status: 400 })
    }

    // Use service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    )

    // Get the current event to check if user can edit it
    const { data: event, error: fetchError } = await supabase
      .from('events')
      .select(`
        *,
        profile:profiles!events_profile_id_fkey(username, profile_pic_url, bio)
      `)
      .eq('id', eventId)
      .single()

    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user can edit this event
    const canEdit = event.profile_id === userId || !!event.post_id // User's own event or Instagram-imported event
    
    if (!canEdit) {
      return NextResponse.json({ error: 'You do not have permission to edit this event' }, { status: 403 })
    }

    // Check if the user profile exists before setting modified_by to prevent foreign key constraint violation
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if user doesn't have a profile yet
      console.error('Error checking user profile:', userError)
    }

    // Prepare update data
    const updateData = {
      ...updates,
      // Only set modified_by if the user profile exists to avoid foreign key constraint violation
      ...(userProfile && !userError ? { 
        modified_by: userId, 
        modified_at: new Date().toISOString() 
      } : {}),
      updated_at: new Date().toISOString()
    }

    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', eventId)
      .select(`
        *,
        categories:event_categories(category:categories(id, name)),
        tags:event_tags(tag),
        profile:profiles!events_profile_id_fkey(username, profile_pic_url, bio),
        school:schools(name, address),
        post:posts!post_id(
          post_images(file_path)
        ),
        event_images:event_images(
          image:images(id, storage_path, url)
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Handle new images if provided
    if (images && images.length > 0) {
      try {
        const imagePromises = images.map(async (imagePath: string) => {
          // Create image record
          const { data: imageRecord, error: imageError } = await supabase
            .from('images')
            .insert({
              storage_path: imagePath,
              url: `${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL}/storage/v1/object/public/event-images/${imagePath}`,
              event_id: eventId
            })
            .select()
            .single()

          if (imageError) throw imageError

          // Link image to event
          const { error: linkError } = await supabase
            .from('event_images')
            .insert({
              event_id: eventId,
              image_id: imageRecord.id
            })

          if (linkError) throw linkError
          return imageRecord
        })

        await Promise.all(imagePromises)
      } catch (imageError) {
        console.error('Error adding images:', imageError)
        // Don't fail the entire request if image upload fails
      }
    }

    return NextResponse.json({ 
      event: updatedEvent,
      message: 'Event updated successfully' 
    })

  } catch (error: any) {
    console.error('Update event API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}