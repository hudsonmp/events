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
    """Reset all posts to unprocessed state."""
    print("🔄 Resetting processed status for all posts...")
    
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
        
        # Get count of posts before reset
        count_result = supabase.table('posts').select('id', count='exact').execute()
        total_posts = count_result.count if count_result.count is not None else 0
        
        if total_posts == 0:
            print("ℹ️  No posts found in the database.")
            return
        
        print(f"📊 Found {total_posts} posts in the database")
        
        # Confirm with user
        confirmation = input("Are you sure you want to reset ALL posts to unprocessed? (y/N): ")
        if confirmation.lower() not in ['y', 'yes']:
            print("❌ Operation cancelled.")
            return
        
        # Reset all posts to processed = False
        result = supabase.table('posts').update({'processed': False}).gte('created_at', '1900-01-01').execute()
        
        if result.data:
            updated_count = len(result.data)
            print(f"✅ Successfully reset {updated_count} posts to unprocessed state")
        else:
            print("⚠️  No posts were updated. They may already be unprocessed.")
            
    except Exception as e:
        print(f"❌ Error connecting to Supabase or updating posts: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 