#!/usr/bin/env python3
"""
Instagram Playwright Scraper
Replaces Instaloader with Playwright for Instagram content scraping
Self-contained solution for event aggregation
"""

import os
import sys
import json
import logging
import asyncio
import tempfile
import hashlib
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass

# Playwright imports
from playwright.async_api import async_playwright, Page, Browser, BrowserContext, Playwright
import aiohttp
import aiofiles

# Supabase imports
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class InstagramPost:
    """Data structure for Instagram posts"""
    shortcode: str
    caption: str
    image_url: str
    video_url: Optional[str]
    timestamp: datetime
    username: str
    likes_count: int
    comments_count: int
    is_video: bool
    post_type: str  # 'post', 'story', 'reel'

@dataclass
class InstagramProfile:
    """Data structure for Instagram profiles"""
    username: str
    full_name: str
    bio: str
    profile_pic_url: str
    followers_count: int
    following_count: int
    posts_count: int
    is_verified: bool

class InstagramPlaywrightScraper:
    """Instagram scraper using Playwright for browser automation"""
    
    def __init__(self):
        # Initialize Supabase client
        self.supabase_url = os.environ.get("SUPABASE_PROJECT_URL")
        self.supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing SUPABASE_PROJECT_URL or SUPABASE_SERVICE_ROLE environment variables")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Determine mode: hourly update (GitHub Actions) or initialization (local)
        self.is_hourly_mode = os.environ.get("GITHUB_ACTIONS") == "true"
        
        # Create temp directory for downloads
        self.temp_dir = Path(tempfile.mkdtemp())
        
        # Storage bucket names
        self.buckets = {
            'posts': 'instagram-posts',
            'stories': 'instagram-stories', 
            'profile_pics': 'instagram-profile-pics',
            'captions': 'instagram-captions'
        }
        
        # Browser and context will be initialized later
        self.playwright: Optional[Playwright] = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        
        # Get target usernames based on mode
        self.target_usernames = self._get_target_usernames()
        
        # Rate limiting settings
        self.request_delay = 2.0  # seconds between requests
        self.max_retries = 3
        
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
                return self._get_local_usernames()
        else:
            # Local mode: interactive CLI or all usernames for initialization
            return self._handle_local_mode()
    
    def _get_local_usernames(self) -> List[str]:
        """Get usernames from local usernames.py file"""
        try:
            from usernames import instagram_usernames
            return instagram_usernames
        except ImportError:
            logger.error("Could not import usernames from usernames.py")
            return []
    
    def _handle_local_mode(self) -> List[str]:
        """Handle local execution mode with CLI interaction."""
        print("\n=== Instagram Playwright Scraper - Local Mode ===")
        print("This will run the INITIALIZATION script (downloads last 3 months)")
        print("Note: Reels are excluded from downloads")
        
        choice = input("\nDo you want to specify a single account? (y/n): ").strip().lower()
        
        if choice in ['y', 'yes']:
            username = input("Enter the Instagram username (without @): ").strip()
            if username:
                return [username]
            else:
                print("Invalid username. Using all accounts.")
                return self._get_local_usernames()
        else:
            usernames = self._get_local_usernames()
            print(f"Will initialize all {len(usernames)} accounts from the database.")
            return usernames

    async def _init_browser(self):
        """Initialize Playwright browser with persistent context"""
        try:
            self.playwright = await async_playwright().start()
            
            # Use persistent context for session persistence
            context_dir = self.temp_dir / "browser_context"
            context_dir.mkdir(exist_ok=True)
            
            if not self.playwright:
                raise RuntimeError("Failed to start Playwright")
            
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            )
            
            self.context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                java_script_enabled=True,
                bypass_csp=True,
                ignore_https_errors=True
            )
            
            self.page = await self.context.new_page()
            
            # Set additional headers
            await self.page.set_extra_http_headers({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            })
            
            logger.info("Browser initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize browser: {e}")
            raise

    async def _close_browser(self):
        """Clean up browser resources"""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            logger.info("Browser closed successfully")
        except Exception as e:
            logger.error(f"Error closing browser: {e}")

    async def _navigate_to_instagram(self):
        """Navigate to Instagram and handle initial loading"""
        if not self.page:
            raise RuntimeError("Browser page not initialized")
            
        try:
            await self.page.goto('https://www.instagram.com/', wait_until='networkidle', timeout=30000)
            await asyncio.sleep(3)
            
            # Handle cookie acceptance if present
            try:
                cookie_button = await self.page.wait_for_selector('button:has-text("Accept")', timeout=5000)
                if cookie_button:
                    await cookie_button.click()
                    await asyncio.sleep(1)
            except:
                pass  # Cookie dialog might not appear
            
            logger.info("Successfully navigated to Instagram")
            
        except Exception as e:
            logger.error(f"Failed to navigate to Instagram: {e}")
            raise

    async def _get_profile_data(self, username: str) -> Optional[InstagramProfile]:
        """Extract profile data from Instagram profile page"""
        if not self.page:
            raise RuntimeError("Browser page not initialized")
            
        try:
            profile_url = f"https://www.instagram.com/{username}/"
            await self.page.goto(profile_url, wait_until='networkidle', timeout=30000)
            await asyncio.sleep(self.request_delay)
            
            # Check if profile exists
            if await self.page.locator('text="Sorry, this page isn\'t available."').count() > 0:
                logger.warning(f"Profile {username} not found or private")
                return None
            
            # Wait for profile data to load
            await self.page.wait_for_selector('header section', timeout=10000)
            
            # Extract profile information
            try:
                # Get profile picture
                profile_pic_element = await self.page.locator('header img').first.get_attribute('src')
                profile_pic_url = profile_pic_element or ""
                
                # Get username and full name
                full_name_element = await self.page.locator('header section h1').first.inner_text()
                full_name = full_name_element.strip() if full_name_element else username
                
                # Get bio
                bio_element = await self.page.locator('header section div:has-text("") >> nth=-1').inner_text()
                bio = bio_element.strip() if bio_element else ""
                
                # Get counts (followers, following, posts)
                counts = await self.page.locator('header section ul li').all_inner_texts()
                followers_count = 0
                following_count = 0
                posts_count = 0
                
                # Parse counts from the text
                for count_text in counts:
                    if 'followers' in count_text.lower():
                        followers_count = self._parse_count(count_text)
                    elif 'following' in count_text.lower():
                        following_count = self._parse_count(count_text)
                    elif 'posts' in count_text.lower():
                        posts_count = self._parse_count(count_text)
                
                # Check if verified
                is_verified = await self.page.locator('header section svg[aria-label="Verified"]').count() > 0
                
                return InstagramProfile(
                    username=username,
                    full_name=full_name,
                    bio=bio,
                    profile_pic_url=profile_pic_url,
                    followers_count=followers_count,
                    following_count=following_count,
                    posts_count=posts_count,
                    is_verified=is_verified
                )
                
            except Exception as e:
                logger.error(f"Error extracting profile data for {username}: {e}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to get profile data for {username}: {e}")
            return None

    def _parse_count(self, count_text: str) -> int:
        """Parse count text like '1.2M followers' to integer"""
        try:
            # Remove non-numeric characters except . and ,
            clean_text = ''.join(c for c in count_text if c.isdigit() or c in '.,' or c.lower() in 'kmb')
            
            # Extract number part
            import re
            match = re.search(r'([\d,.]+)\s*([kmb]?)', clean_text.lower())
            if match:
                number_str, multiplier = match.groups()
                number = float(number_str.replace(',', ''))
                
                if multiplier == 'k':
                    return int(number * 1000)
                elif multiplier == 'm':
                    return int(number * 1000000)
                elif multiplier == 'b':
                    return int(number * 1000000000)
                else:
                    return int(number)
            
            return 0
        except:
            return 0

    async def _get_posts_from_profile(self, username: str, limit_date: Optional[datetime] = None) -> List[InstagramPost]:
        """Extract posts from Instagram profile page"""
        if not self.page:
            raise RuntimeError("Browser page not initialized")
            
        posts = []
        
        try:
            # Scroll to load posts
            await self._scroll_and_load_posts()
            
            # Get all post links
            post_links = await self.page.locator('article a[href*="/p/"]').all()
            
            logger.info(f"Found {len(post_links)} posts for {username}")
            
            for i, link in enumerate(post_links):
                if limit_date and self.is_hourly_mode and i >= 10:
                    # Limit recent posts in hourly mode
                    break
                    
                try:
                    href = await link.get_attribute('href')
                    if href:
                        post_url = f"https://www.instagram.com{href}"
                        post = await self._extract_post_data(post_url, username)
                        
                        if post:
                            # Check date limit for initialization mode
                            if limit_date and post.timestamp < limit_date:
                                logger.info(f"Reached date limit for {username}")
                                break
                                
                            posts.append(post)
                            
                        # Add delay between post extractions
                        await asyncio.sleep(self.request_delay)
                        
                except Exception as e:
                    logger.error(f"Error processing post {i} for {username}: {e}")
                    continue
            
            logger.info(f"Extracted {len(posts)} posts for {username}")
            return posts
            
        except Exception as e:
            logger.error(f"Failed to get posts for {username}: {e}")
            return []

    async def _scroll_and_load_posts(self):
        """Scroll down to load more posts"""
        if not self.page:
            raise RuntimeError("Browser page not initialized")
            
        try:
            # Scroll down multiple times to load posts
            for _ in range(3):
                await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(2)
                
            # Wait for posts to load
            await self.page.wait_for_selector('article a[href*="/p/"]', timeout=10000)
            
        except Exception as e:
            logger.warning(f"Error scrolling to load posts: {e}")

    async def _extract_post_data(self, post_url: str, username: str) -> Optional[InstagramPost]:
        """Extract data from individual post"""
        if not self.page:
            raise RuntimeError("Browser page not initialized")
            
        try:
            await self.page.goto(post_url, wait_until='networkidle', timeout=30000)
            await asyncio.sleep(1)
            
            # Extract shortcode from URL
            shortcode = post_url.split('/p/')[1].split('/')[0]
            
            # Get post content
            caption_element = await self.page.locator('article div[data-testid="post-caption"] span').first
            caption = ""
            if await caption_element.count() > 0:
                caption = await caption_element.inner_text()
            
            # Get image/video URL
            media_element = await self.page.locator('article img, article video').first
            image_url = ""
            video_url = None
            is_video = False
            
            if await media_element.count() > 0:
                tag_name = await media_element.evaluate('el => el.tagName.toLowerCase()')
                if tag_name == 'img':
                    image_url = await media_element.get_attribute('src') or ""
                elif tag_name == 'video':
                    video_url = await media_element.get_attribute('src') or ""
                    is_video = True
            
            # Get timestamp
            time_element = await self.page.locator('article time').first
            timestamp = datetime.now()
            if await time_element.count() > 0:
                datetime_attr = await time_element.get_attribute('datetime')
                if datetime_attr:
                    timestamp = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
            
            # Get engagement metrics
            likes_count = await self._extract_likes_count()
            comments_count = await self._extract_comments_count()
            
            return InstagramPost(
                shortcode=shortcode,
                caption=caption,
                image_url=image_url,
                video_url=video_url,
                timestamp=timestamp,
                username=username,
                likes_count=likes_count,
                comments_count=comments_count,
                is_video=is_video,
                post_type='post'
            )
            
        except Exception as e:
            logger.error(f"Error extracting post data from {post_url}: {e}")
            return None

    async def _extract_likes_count(self) -> int:
        """Extract likes count from post"""
        if not self.page:
            return 0
            
        try:
            likes_element = await self.page.locator('section span:has-text("likes"), section span:has-text("like")').first
            if await likes_element.count() > 0:
                likes_text = await likes_element.inner_text()
                return self._parse_count(likes_text)
        except:
            pass
        return 0

    async def _extract_comments_count(self) -> int:
        """Extract comments count from post"""
        if not self.page:
            return 0
            
        try:
            comments_elements = await self.page.locator('article ul li').all()
            return max(0, len(comments_elements) - 1)  # Subtract 1 for the caption
        except:
            pass
        return 0

    async def _download_file(self, url: str, filename: str) -> Optional[Path]:
        """Download file from URL"""
        try:
            if not url:
                return None
                
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        file_path = self.temp_dir / filename
                        async with aiofiles.open(file_path, 'wb') as f:
                            async for chunk in response.content.iter_chunked(8192):
                                await f.write(chunk)
                        
                        logger.debug(f"Downloaded {filename}")
                        return file_path
                    else:
                        logger.warning(f"Failed to download {url}: HTTP {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error downloading file {url}: {e}")
            return None

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

    def _upload_caption_to_storage(self, caption_text: str, username: str, shortcode: str, timestamp: datetime) -> Optional[str]:
        """Upload caption text to storage as a text file."""
        try:
            if not caption_text or caption_text.strip() == "":
                return None
                
            # Create caption filename
            date_str = timestamp.strftime("%Y-%m-%d_%H-%M-%S")
            caption_filename = f"{username}_{date_str}_caption_{shortcode}.txt"
            storage_path = f"{username}/{caption_filename}"
            
            # Create temporary file with caption
            temp_caption_file = self.temp_dir / caption_filename
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

    async def _process_posts(self, posts: List[InstagramPost], username: str):
        """Process and upload posts to storage"""
        for post in posts:
            try:
                # Generate file paths
                date_str = post.timestamp.strftime("%Y-%m-%d_%H-%M-%S")
                
                # Download and upload media
                if post.image_url:
                    # Download image
                    image_filename = f"{username}_{date_str}_{post.shortcode}.jpg"
                    image_path = await self._download_file(post.image_url, image_filename)
                    
                    if image_path and image_path.exists():
                        # Upload to posts bucket
                        storage_path = f"{username}/{image_filename}"
                        self._upload_file_to_storage(image_path, self.buckets['posts'], storage_path)
                        
                        # Clean up temp file
                        image_path.unlink()
                
                if post.video_url:
                    # Download video
                    video_filename = f"{username}_{date_str}_{post.shortcode}.mp4"
                    video_path = await self._download_file(post.video_url, video_filename)
                    
                    if video_path and video_path.exists():
                        # Upload to posts bucket
                        storage_path = f"{username}/{video_filename}"
                        self._upload_file_to_storage(video_path, self.buckets['posts'], storage_path)
                        
                        # Clean up temp file
                        video_path.unlink()
                
                # Upload caption
                if post.caption:
                    self._upload_caption_to_storage(post.caption, username, post.shortcode, post.timestamp)
                
                logger.info(f"Processed post {post.shortcode} for {username}")
                
            except Exception as e:
                logger.error(f"Error processing post {post.shortcode} for {username}: {e}")
                continue

    async def _process_profile(self, profile: InstagramProfile):
        """Process and upload profile data"""
        try:
            if profile.profile_pic_url:
                # Download profile picture
                pic_filename = f"{profile.username}_profile_pic.jpg"
                pic_path = await self._download_file(profile.profile_pic_url, pic_filename)
                
                if pic_path and pic_path.exists():
                    # Upload to profile pics bucket
                    storage_path = f"{profile.username}/{pic_filename}"
                    self._upload_file_to_storage(pic_path, self.buckets['profile_pics'], storage_path)
                    
                    # Clean up temp file
                    pic_path.unlink()
            
            logger.info(f"Processed profile for {profile.username}")
            
        except Exception as e:
            logger.error(f"Error processing profile for {profile.username}: {e}")

    async def scrape_profile_initialization(self, username: str):
        """Scrape profile for initialization (last 3 months)"""
        try:
            logger.info(f"INITIALIZATION: Scraping {username} (last 3 months)")
            
            # Get profile data
            profile = await self._get_profile_data(username)
            if profile:
                await self._process_profile(profile)
            
            # Set date limit for 3 months ago
            three_months_ago = datetime.now() - timedelta(days=90)
            
            # Get posts from last 3 months
            posts = await self._get_posts_from_profile(username, three_months_ago)
            
            # Filter out reels and process posts
            filtered_posts = [post for post in posts if post.post_type != 'reel']
            await self._process_posts(filtered_posts, username)
            
            logger.info(f"Successfully scraped {username} - {len(filtered_posts)} posts processed")
            
        except Exception as e:
            logger.error(f"Failed to scrape profile {username} for initialization: {e}")

    async def scrape_profile_hourly(self, username: str):
        """Scrape profile for hourly updates (recent posts only)"""
        try:
            logger.info(f"HOURLY UPDATE: Fast-updating {username}")
            
            # Get profile data
            profile = await self._get_profile_data(username)
            if profile:
                await self._process_profile(profile)
            
            # Get recent posts (limit to last 10)
            posts = await self._get_posts_from_profile(username)
            
            # Filter out reels and limit posts
            filtered_posts = [post for post in posts[:10] if post.post_type != 'reel']
            await self._process_posts(filtered_posts, username)
            
            logger.info(f"Successfully updated {username} - {len(filtered_posts)} posts processed")
            
        except Exception as e:
            logger.error(f"Failed to scrape profile {username} for hourly update: {e}")

    def cleanup_temp_files(self):
        """Clean up temporary files after upload."""
        try:
            import shutil
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            logger.info("Cleaned up temporary files")
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")

    async def run(self):
        """Main execution method."""
        mode = "HOURLY UPDATE" if self.is_hourly_mode else "INITIALIZATION"
        logger.info(f"Starting Instagram Playwright scraper in {mode} mode")
        logger.info(f"Target usernames: {len(self.target_usernames)} accounts")
        
        if not self.target_usernames:
            logger.error("No target usernames found")
            return
        
        try:
            # Initialize browser
            await self._init_browser()
            await self._navigate_to_instagram()
            
            success_count = 0
            
            for username in self.target_usernames:
                try:
                    if self.is_hourly_mode:
                        await self.scrape_profile_hourly(username)
                    else:
                        await self.scrape_profile_initialization(username)
                    
                    success_count += 1
                    logger.info(f"Successfully processed {username} ({success_count}/{len(self.target_usernames)})")
                    
                    # Add delay between profiles
                    await asyncio.sleep(self.request_delay * 2)
                    
                except Exception as e:
                    logger.error(f"Failed to process {username}: {e}")
                    continue
            
            logger.info(f"Scraping completed: {success_count}/{len(self.target_usernames)} accounts processed successfully")
            
        except Exception as e:
            logger.error(f"Scraping job failed: {e}")
            raise
        finally:
            await self._close_browser()
            self.cleanup_temp_files()

def main():
    """Entry point for both GitHub Actions and local execution."""
    try:
        scraper = InstagramPlaywrightScraper()
        asyncio.run(scraper.run())
    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()