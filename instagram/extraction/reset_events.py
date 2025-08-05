#!/usr/bin/env python3
"""
CLI script to reset the 'processed' column in the 'posts' table to FALSE.
This allows posts to be reprocessed by the AI extraction pipeline.
"""

import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

def main():
    """Reset all posts to unprocessed state and delete all events with cascade."""
    print("🔄 Resetting processed status for all posts and deleting all events...")
    
    # Load environment variables
    load_dotenv()
    
    # Initialize Supabase client
    supabase_url = os.getenv("SUPABASE_PROJECT_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Missing required environment variables:")
        print("   - SUPABASE_PROJECT_URL")
        print("   - SUPABASE_SERVICE_ROLE")
        print("Please check your .env file.")
        sys.exit(1)
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Get count of posts and events before reset
        posts_count_result = supabase.table('posts').select('id', count='exact').execute()
        total_posts = posts_count_result.count if posts_count_result.count is not None else 0
        
        events_count_result = supabase.table('events').select('id', count='exact').execute()
        total_events = events_count_result.count if events_count_result.count is not None else 0
        
        print(f"📊 Found {total_posts} posts and {total_events} events in the database")
        
        if total_posts == 0 and total_events == 0:
            print("ℹ️  No posts or events found in the database.")
            return
        
        # Confirm with user
        print("\n⚠️  This will:")
        print("   - Reset ALL posts to unprocessed status")
        print("   - DELETE ALL events and their related data (tags, categories, attendees, etc.)")
        confirmation = input("\nAre you sure you want to proceed? (y/N): ")
        if confirmation.lower() not in ['y', 'yes']:
            print("❌ Operation cancelled.")
            return
        
        # Reset all posts to processed = False
        if total_posts > 0:
            print("\n🔄 Resetting posts...")
            posts_result = supabase.table('posts').update({'processed': False}).gte('created_at', '1900-01-01').execute()
            
            if posts_result.data:
                updated_count = len(posts_result.data)
                print(f"✅ Successfully reset {updated_count} posts to unprocessed state")
            else:
                print("⚠️  No posts were updated. They may already be unprocessed.")
        
        # Delete all events (cascade will handle related tables)
        if total_events > 0:
            print("\n🗑️  Deleting all events (with cascade)...")
            events_result = supabase.table('events').delete().gte('created_at', '1900-01-01').execute()
            
            if events_result.data:
                deleted_count = len(events_result.data)
                print(f"✅ Successfully deleted {deleted_count} events and all related data")
            else:
                print("⚠️  No events were deleted. They may not exist.")
            
    except Exception as e:
        print(f"❌ Error connecting to Supabase or updating data: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
