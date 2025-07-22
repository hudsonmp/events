#!/usr/bin/env python3
"""
Instagram Scraping Pipeline - Main Orchestrator
This script coordinates the entire scraping process by:
1. Loading all active profiles from Supabase
2. For each profile: updating profile info and scraping new posts
3. Storing everything in Supabase storage buckets and database
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import time
import random

# Add the current directory to the path to import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from scraper import InstagramScraper
from store import SupabaseStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('instagram_scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class InstagramPipeline:
    """Main orchestrator for the Instagram scraping pipeline"""
    
    def __init__(self):
        self.scraper = InstagramScraper()
        self.store = SupabaseStore()
        self.one_month_ago = datetime.now() - timedelta(days=30)
        
    def run(self):
        """Main execution method"""
        try:
            logger.info("Starting Instagram scraping pipeline...")
            
            # Load all active profiles
            profiles = self.store.get_active_profiles()
            logger.info(f"Found {len(profiles)} active profiles to process")
            
            if not profiles:
                logger.warning("No active profiles found in database")
                return
            
            # Process each profile
            for profile in profiles:
                try:
                    self.process_profile(profile)
                    # Add delay between profiles to avoid rate limiting
                    delay = random.uniform(5, 15)  # Random delay between 5-15 seconds
                    logger.info(f"Waiting {delay:.1f} seconds before next profile...")
                    time.sleep(delay)
                    
                except Exception as e:
                    logger.error(f"Error processing profile {profile.get('username', 'unknown')}: {str(e)}")
                    continue
            
            logger.info("Instagram scraping pipeline completed successfully")
            
        except Exception as e:
            logger.error(f"Critical error in pipeline: {str(e)}")
            raise
    
    def process_profile(self, profile: Dict[str, Any]):
        """Process a single Instagram profile"""
        username = profile['username']
        profile_id = profile['id']
        last_seen_shortcode = profile.get('last_seen_shortcode')
        
        logger.info(f"Processing profile: {username}")
        
        try:
            # Step 1: Update profile information
            logger.info(f"Fetching profile info for {username}")
            profile_data = self.scraper.fetch_profile(username)
            
            if not profile_data:
                logger.warning(f"Could not fetch profile data for {username}")
                return
            
            # Check if profile is private
            if profile_data.get('is_private', False):
                logger.info(f"Profile {username} is private, skipping...")
                return
            
            # Update profile in database
            logger.info(f"Updating profile data for {username}")
            self.store.upsert_profile(profile_id, profile_data)
            
            # Step 2: Scrape new posts
            logger.info(f"Scraping posts for {username} (stopping at: {last_seen_shortcode or 'none'})")
            new_posts = self.scraper.stream_posts(username, last_seen_shortcode)
            
            if new_posts:
                logger.info(f"Found {len(new_posts)} new posts for {username}")
                
                # Step 3: Store new posts
                self.store.upsert_posts(profile_id, new_posts)
                
                # Step 4: Update checkpoint
                newest_shortcode = new_posts[0]['shortcode']  # Posts are ordered newest first
                self.store.update_last_seen_shortcode(profile_id, newest_shortcode)
                
                logger.info(f"Updated last_seen_shortcode for {username} to {newest_shortcode}")
            else:
                logger.info(f"No new posts found for {username}")
                
        except Exception as e:
            logger.error(f"Error processing profile {username}: {str(e)}")
            raise

def main():
    """Entry point for the scraping pipeline"""
    try:
        pipeline = InstagramPipeline()
        pipeline.run()
    except KeyboardInterrupt:
        logger.info("Pipeline interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 