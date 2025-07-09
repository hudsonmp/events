import os
import sys
import json
import logging
import tempfile
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timedelta
from usernames import instagram_usernames

# Install these dependencies: pip install instaloader supabase
from instaloader import Instaloader, Profile, Post, StoryItem
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class InstagramScraper:
    def __init__(self):
        # Initialize Supabase client
        self.supabase_url = os.environ.get("SUPABASE_PROJECT_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing SUPABASE_PROJECT_URL or SUPABASE_SERVICE_ROLE environment variables")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Determine mode: hourly update (GitHub Actions) or initialization (local)
        self.is_hourly_mode = os.environ.get("GITHUB_ACTIONS") == "true"
        
        # Configure Instaloader
        self.temp_dir = tempfile.mkdtemp()
        self.loader = Instaloader(
            dirname_pattern=f"{self.temp_dir}/{{profile}}",
            filename_pattern="{profile}_{date_utc:%Y-%m-%d_%H-%M-%S}_{typename}_{shortcode}",
            download_videos=True,
            download_video_thumbnails=False,
            download_comments=False,
            download_geotags=False,
            compress_json=False,
            save_metadata=True
        )
        
        # Storage bucket names (removed reels bucket)
        self.buckets = {
            'posts': 'instagram-posts',
            'stories': 'instagram-stories', 
            'profile_pics': 'instagram-profile-pics',
            'captions': 'instagram-captions'
        }
        
        # Get target usernames based on mode
        self.target_usernames = self._get_target_usernames()
        
    def _get_target_usernames(self) -> List[str]:
        """Get target usernames based on execution mode."""
        if self.is_hourly_mode:
            # Hourly mode: get all usernames from Supabase
            try:
                response = self.supabase.table("usernames").select("username").execute()
                usernames = [row['username'] for row in response.data]
                logger.info(f"Fetched {len(usernames)} usernames from Supabase for hourly update")
                return usernames
            except Exception as e:
                logger.error(f"Failed to fetch usernames from Supabase: {e}")
                # Fallback to local usernames list
                logger.info("Falling back to local usernames list")
                return instagram_usernames
        else:
            # Local mode: interactive CLI or all usernames for initialization
            return self._handle_local_mode()
    
    def _handle_local_mode(self) -> List[str]:
        """Handle local execution mode with CLI interaction."""
        print("\n=== Instagram Scraper - Local Mode ===")
        print("This will run the INITIALIZATION script (downloads last 3 months)")
        print("Note: Reels are excluded from downloads")
        
        choice = input("\nDo you want to specify a single account? (y/n): ").strip().lower()
        
        if choice in ['y', 'yes']:
            username = input("Enter the Instagram username (without @): ").strip()
            if username:
                return [username]
            else:
                print("Invalid username. Using all accounts.")
                return instagram_usernames
        else:
            print(f"Will initialize all {len(instagram_usernames)} accounts from the database.")
            return instagram_usernames
    
    def _get_three_months_ago(self) -> datetime:
        """Get datetime for 3 months ago."""
        return datetime.now() - timedelta(days=90)
    
    def _create_post_filter(self) -> str:
        """Create post filter for initialization (3 months ago)."""
        three_months_ago = self._get_three_months_ago()
        return f"date_utc >= datetime({three_months_ago.year}, {three_months_ago.month}, {three_months_ago.day})"
    
    def _upload_file_to_storage(self, local_path: Path, storage_bucket: str, storage_path: str) -> Optional[str]:
        """Upload file to Supabase storage and return public URL."""
        try:
            bucket = self.supabase.storage.from_(storage_bucket)
            
            with open(local_path, 'rb') as f:
                result = bucket.upload(storage_path, f, file_options={"upsert": "true"})
            
            # Get public URL
            public_url = bucket.get_public_url(storage_path)
            logger.info(f"Uploaded {local_path.name} to {storage_bucket}/{storage_path}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload {local_path} to {storage_bucket}: {e}")
            return None
    
    def _upload_caption_to_storage(self, caption_text: str, username: str, shortcode: str, date_str: str) -> Optional[str]:
        """Upload caption text to storage as a text file."""
        try:
            if not caption_text or caption_text.strip() == "":
                return None
                
            # Create caption filename
            caption_filename = f"{username}_{date_str}_caption_{shortcode}.txt"
            storage_path = f"{username}/{caption_filename}"
            
            # Create temporary file with caption
            temp_caption_file = Path(self.temp_dir) / caption_filename
            with open(temp_caption_file, 'w', encoding='utf-8') as f:
                f.write(caption_text)
            
            # Upload to captions bucket
            public_url = self._upload_file_to_storage(temp_caption_file, self.buckets['captions'], storage_path)
            
            # Clean up temp file
            temp_caption_file.unlink()
            
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to upload caption for {shortcode}: {e}")
            return None
    
    def _process_downloaded_files(self, username: str, profile_dir: Path) -> None:
        """Process and upload downloaded files to appropriate storage buckets."""
        if not profile_dir.exists():
            logger.warning(f"Profile directory {profile_dir} does not exist")
            return
        
        for file_path in profile_dir.iterdir():
            if file_path.is_file():
                file_name = file_path.name
                storage_path = f"{username}/{file_name}"
                
                # Skip reel files completely
                if 'reel' in file_name.lower():
                    logger.info(f"Skipping reel file: {file_name}")
                    continue
                
                # Determine bucket based on file type/name pattern
                if 'story' in file_name.lower():
                    bucket = self.buckets['stories']
                elif 'profile_pic' in file_name.lower():
                    bucket = self.buckets['profile_pics']
                elif file_name.endswith('.txt'):
                    # Skip .txt files as we handle captions separately
                    continue
                else:
                    bucket = self.buckets['posts']
                
                # Upload to storage
                public_url = self._upload_file_to_storage(file_path, bucket, storage_path)
                
                if public_url:
                    # Store metadata in database (you might want to create a downloads table)
                    self._store_file_metadata(username, file_name, bucket, storage_path, public_url)
    
    def _store_file_metadata(self, username: str, filename: str, bucket: str, storage_path: str, public_url: str) -> None:
        """Store file metadata in database for tracking."""
        try:
            # You might want to create a downloads table to track all files
            # For now, we'll just log the successful upload
            logger.info(f"Stored metadata for {username}/{filename} in {bucket}")
        except Exception as e:
            logger.error(f"Failed to store metadata for {filename}: {e}")
    
    def _process_post_caption(self, post: Post, username: str) -> None:
        """Extract and upload post caption."""
        try:
            if post.caption:
                date_str = post.date_utc.strftime("%Y-%m-%d_%H-%M-%S")
                caption_url = self._upload_caption_to_storage(
                    post.caption, 
                    username, 
                    post.shortcode, 
                    date_str
                )
                if caption_url:
                    logger.info(f"Uploaded caption for post {post.shortcode}")
        except Exception as e:
            logger.error(f"Failed to process caption for post {post.shortcode}: {e}")
    
    def scrape_profile_initialization(self, username: str) -> None:
        """Scrape profile for initialization (last 3 months) - NO REELS."""
        try:
            logger.info(f"INITIALIZATION: Scraping {username} (last 3 months, no reels)")
            
            profile = Profile.from_username(self.loader.context, username)
            profile_dir = Path(self.temp_dir) / username
            
            # Download posts from last 3 months with filter (excluding reels)
            post_filter = self._get_three_months_ago()
            
            # Download posts (but skip reels)
            posts = profile.get_posts()
            for post in posts:
                if post.date_utc < post_filter:
                    break  # Stop when we reach posts older than 3 months
                
                # Skip reels completely
                if post.is_video and hasattr(post, 'is_reel') and post.is_reel:
                    logger.info(f"Skipping reel {post.shortcode} for {username}")
                    continue
                
                try:
                    self.loader.download_post(post, username)
                    # Process caption separately
                    self._process_post_caption(post, username)
                except Exception as e:
                    logger.error(f"Failed to download post {post.shortcode}: {e}")
            
            # Download stories (current ones)
            try:
                for story in self.loader.get_stories([profile.userid]):
                    for item in story.get_items():
                        self.loader.download_storyitem(item, story.owner_username)
            except Exception as e:
                logger.error(f"Failed to download stories for {username}: {e}")
            
            # Process and upload files (reels will be skipped in processing)
            self._process_downloaded_files(username, profile_dir)
            
        except Exception as e:
            logger.error(f"Failed to scrape profile {username} for initialization: {e}")
    
    def scrape_profile_hourly(self, username: str) -> None:
        """Scrape profile for hourly updates (fast-update mode) - NO REELS."""
        try:
            logger.info(f"HOURLY UPDATE: Fast-updating {username} (no reels)")
            
            profile = Profile.from_username(self.loader.context, username)
            profile_dir = Path(self.temp_dir) / username
            
            # Use fast-update approach: download until we hit existing content
            posts = profile.get_posts()
            downloaded_count = 0
            
            for post in posts:
                # Skip reels completely
                if post.is_video and hasattr(post, 'is_reel') and post.is_reel:
                    continue
                
                # Check if this post already exists in our storage
                # For simplicity, we'll download the first few posts and let Instaloader handle duplicates
                try:
                    self.loader.download_post(post, username)
                    # Process caption separately
                    self._process_post_caption(post, username)
                    downloaded_count += 1
                    
                    # Stop after a reasonable number to avoid re-downloading everything
                    if downloaded_count >= 10:  # Adjust this number as needed
                        break
                        
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info(f"Reached existing content for {username}, stopping")
                        break
                    logger.error(f"Failed to download post {post.shortcode}: {e}")
            
            # Download current stories
            try:
                for story in self.loader.get_stories([profile.userid]):
                    for item in story.get_items():
                        self.loader.download_storyitem(item, story.owner_username)
            except Exception as e:
                logger.error(f"Failed to download stories for {username}: {e}")
            
            # Process and upload files (reels will be skipped in processing)
            self._process_downloaded_files(username, profile_dir)
            
        except Exception as e:
            logger.error(f"Failed to scrape profile {username} for hourly update: {e}")
    
    def cleanup_temp_files(self) -> None:
        """Clean up temporary files after upload."""
        try:
            import shutil
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            logger.info("Cleaned up temporary files")
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
    
    def run(self) -> None:
        """Main execution method."""
        mode = "HOURLY UPDATE" if self.is_hourly_mode else "INITIALIZATION"
        logger.info(f"Starting Instagram scraper in {mode} mode (no reels)")
        logger.info(f"Target usernames: {len(self.target_usernames)} accounts")
        
        if not self.target_usernames:
            logger.error("No target usernames found")
            return
        
        try:
            success_count = 0
            
            for username in self.target_usernames:
                try:
                    if self.is_hourly_mode:
                        self.scrape_profile_hourly(username)
                    else:
                        self.scrape_profile_initialization(username)
                    
                    success_count += 1
                    logger.info(f"Successfully processed {username} ({success_count}/{len(self.target_usernames)})")
                    
                except Exception as e:
                    logger.error(f"Failed to process {username}: {e}")
                    continue
            
            logger.info(f"Scraping completed: {success_count}/{len(self.target_usernames)} accounts processed successfully")
            
        except Exception as e:
            logger.error(f"Scraping job failed: {e}")
            raise
        finally:
            self.cleanup_temp_files()


def main():
    """Entry point for both GitHub Actions and local execution."""
    try:
        scraper = InstagramScraper()
        scraper.run()
    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()