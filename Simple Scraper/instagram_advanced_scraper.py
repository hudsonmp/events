import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
from pathlib import Path

class InstagramAdvancedScraper:
    def __init__(self):
        self.browser = None
        self.page = None

    async def start_browser(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.page = await self.browser.new_page()
        await self.page.set_extra_http_headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    async def close_browser(self):
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()

    async def _scroll_to_load_posts(self, days_back: int):
        """
        Enhanced scrolling to load more posts for longer timeframes
        
        Args:
            days_back (int): Number of days to look back
        """
        try:
            # Calculate scroll iterations based on timeframe
            if days_back <= 30:
                scroll_iterations = 3
            elif days_back <= 90:
                scroll_iterations = 5
            elif days_back <= 365:
                scroll_iterations = 8
            else:
                scroll_iterations = 12
            
            print(f"Scrolling {scroll_iterations} times to load posts from {days_back} days back...")
            
            for i in range(scroll_iterations):
                # Scroll to bottom
                await self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                await asyncio.sleep(2)
                
                # Wait for new content to load
                try:
                    await self.page.wait_for_selector('article a[href*="/p/"]', timeout=5000)
                except:
                    pass  # Continue if no new posts found
                
                # Check if we have enough posts loaded
                current_posts = await self.page.query_selector_all('article a[href*="/p/"]')
                if len(current_posts) >= 50:  # Stop if we have plenty of posts
                    break
                    
                print(f"Scroll {i+1}/{scroll_iterations} - Found {len(current_posts)} posts so far")
            
            total_posts = await self.page.query_selector_all('article a[href*="/p/"]')
            print(f"Finished scrolling. Total posts found: {len(total_posts)}")
            
        except Exception as e:
            print(f"Error during scrolling: {e}")
            # Continue even if scrolling fails

    async def get_posts_details(self, username: str, max_posts: int = 5, days_back: int = 30) -> Dict[str, Any]:
        """
        Get details of recent posts from an Instagram account
        
        Args:
            username (str): Instagram username
            max_posts (int): Maximum number of posts to scrape
            days_back (int): How many days back to look for posts
            
        Returns:
            Dict containing posts data and metadata
        """
        try:
            profile_url = f"https://www.instagram.com/{username}/"
            await self.page.goto(profile_url, wait_until='networkidle')
            await self.page.wait_for_timeout(3000)

            # Check if profile exists
            if await self.page.locator('text="Sorry, this page isn\'t available."').count() > 0:
                return {
                    "error": f"Profile @{username} not found or is private",
                    "success": False
                }

            # Enhanced scrolling for longer timeframes
            await self._scroll_to_load_posts(days_back)
            
            # Find all post links
            post_links = await self.page.query_selector_all('article a[href*="/p/"]')
            if not post_links:
                return {
                    "error": "No posts found",
                    "success": False
                }

            posts_data = []
            cutoff_date = datetime.now() - timedelta(days=days_back)
            posts_processed = 0

            for i, link in enumerate(post_links):
                if posts_processed >= max_posts:
                    break

                try:
                    post_href = await link.get_attribute('href')
                    if not post_href:
                        continue

                    post_url = f"https://www.instagram.com{post_href}"
                    
                    # Check if page is still valid
                    if not self.page or self.page.is_closed():
                        print(f"Page was closed, recreating for post {i}")
                        self.page = await self.browser.new_page()
                        await self.page.set_extra_http_headers({
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        })
                    
                    await self.page.goto(post_url, wait_until='networkidle', timeout=30000)
                    await self.page.wait_for_timeout(2000)

                    # Get timestamp
                    timestamp = None
                    time_elem = await self.page.query_selector('time[datetime]')
                    if time_elem:
                        datetime_attr = await time_elem.get_attribute('datetime')
                        if datetime_attr:
                            timestamp = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
                            
                            # Check if post is within timeframe
                            # Make sure both datetimes are timezone-aware for comparison
                            if timestamp and timestamp.replace(tzinfo=None) < cutoff_date.replace(tzinfo=None):
                                continue

                    # Get image URL - using the simple approach that works
                    image_url = None
                    img_elem = await self.page.query_selector('article img')
                    if img_elem:
                        image_url = await img_elem.get_attribute('src')

                    # Get caption
                    caption = None
                    caption_elem = await self.page.query_selector('article div[role="button"] span, article ul li div div div span')
                    if caption_elem:
                        caption = await caption_elem.inner_text()

                    # Get title (alt text)
                    title = None
                    if img_elem:
                        title = await img_elem.get_attribute('alt')

                    # Get post ID from URL
                    post_id = post_href.split('/p/')[1].split('/')[0] if '/p/' in post_href else None

                    post_data = {
                        "post_id": post_id,
                        "post_url": post_url,
                        "timestamp": timestamp.isoformat() if timestamp else None,
                        "formatted_time": timestamp.strftime("%Y-%m-%d %H:%M:%S UTC") if timestamp else None,
                        "image_url": image_url,
                        "caption": caption,
                        "title": title,
                        "days_ago": (datetime.now().replace(tzinfo=None) - timestamp.replace(tzinfo=None)).days if timestamp else None
                    }

                    posts_data.append(post_data)
                    posts_processed += 1

                    # Add delay between posts
                    await asyncio.sleep(1)

                except Exception as e:
                    print(f"Error processing post {i}: {e}")
                    continue

            return {
                "username": username,
                "posts": posts_data,
                "total_posts_found": len(posts_data),
                "max_posts_requested": max_posts,
                "days_back_requested": days_back,
                "success": True
            }

        except Exception as e:
            return {
                "error": str(e),
                "success": False
            }

    async def scrape_account(self, username: str, max_posts: int = 5, days_back: int = 30) -> Dict[str, Any]:
        """
        Main method to scrape Instagram account
        
        Args:
            username (str): Instagram username
            max_posts (int): Maximum number of posts to scrape
            days_back (int): How many days back to look for posts
            
        Returns:
            Dict containing scraping results
        """
        try:
            await self.start_browser()
            result = await self.get_posts_details(username, max_posts, days_back)
            return result
        finally:
            await self.close_browser()

async def main():
    """Example usage"""
    scraper = InstagramAdvancedScraper()
    test_username = "pathenryasb"
    
    print(f"Scraping recent posts for @{test_username}...")
    result = await scraper.scrape_account(
        username=test_username,
        max_posts=3,
        days_back=30
    )
    
    print("Results:")
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main()) 