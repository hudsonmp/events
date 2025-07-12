import asyncio
from playwright.async_api import async_playwright
import re
from datetime import datetime
import json

class InstagramScraper:
    def __init__(self):
        self.browser = None
        self.page = None
    
    async def start_browser(self):
        """Start the browser and create a new page"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.page = await self.browser.new_page()
        
        # Set user agent to avoid detection
        await self.page.set_extra_http_headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    async def close_browser(self):
        """Close the browser and playwright"""
        if self.browser:
            await self.browser.close()
        if hasattr(self, 'playwright'):
            await self.playwright.stop()
    
    async def get_recent_post_timestamp(self, username):
        """
        Get the timestamp of the most recent post from an Instagram account
        
        Args:
            username (str): Instagram username (without @)
            
        Returns:
            dict: Dictionary containing timestamp and other post info
        """
        try:
            # Navigate to the Instagram profile
            profile_url = f"https://www.instagram.com/{username}/"
            await self.page.goto(profile_url, wait_until='networkidle')
            
            # Wait for the page to load
            await self.page.wait_for_timeout(3000)
            
            # Look for the first post (most recent)
            # Instagram posts are typically in article tags
            posts = await self.page.query_selector_all('article a')
            
            if not posts:
                return {"error": "No posts found"}
            
            # Click on the first post to open it
            await posts[0].click()
            await self.page.wait_for_timeout(2000)
            
            # Look for the timestamp in the post modal
            # Instagram timestamps are usually in time tags or specific elements
            timestamp_selectors = [
                'time',
                '[datetime]',
                'a[href*="/p/"] time',
                'article time'
            ]
            
            timestamp_element = None
            for selector in timestamp_selectors:
                timestamp_element = await self.page.query_selector(selector)
                if timestamp_element:
                    break
            
            if timestamp_element:
                # Get the datetime attribute
                datetime_attr = await timestamp_element.get_attribute('datetime')
                if datetime_attr:
                    # Parse the timestamp
                    timestamp = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
                    return {
                        "username": username,
                        "timestamp": timestamp.isoformat(),
                        "formatted_time": timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "success": True
                    }
            
            # If we can't find the timestamp element, try to get it from the URL
            current_url = self.page.url
            if '/p/' in current_url:
                # Extract post ID and try alternative method
                post_id = current_url.split('/p/')[1].split('/')[0]
                return {
                    "username": username,
                    "post_id": post_id,
                    "url": current_url,
                    "message": "Post found but timestamp not accessible",
                    "success": False
                }
            
            return {"error": "Could not find timestamp", "success": False}
            
        except Exception as e:
            return {"error": str(e), "success": False}
    
    async def scrape_account(self, username):
        """
        Main method to scrape an Instagram account's most recent post timestamp
        
        Args:
            username (str): Instagram username (without @)
            
        Returns:
            dict: Results of the scraping operation
        """
        try:
            await self.start_browser()
            result = await self.get_recent_post_timestamp(username)
            return result
        finally:
            await self.close_browser()

async def main():
    """Example usage of the Instagram scraper"""
    scraper = InstagramScraper()
    
    # Test with a popular account (you can change this)
    test_username = "instagram"  # Instagram's official account
    
    print(f"Scraping most recent post timestamp for @{test_username}...")
    result = await scraper.scrape_account(test_username)
    
    print("Results:")
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main()) 