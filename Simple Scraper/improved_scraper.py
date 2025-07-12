import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime
import re

class ImprovedInstagramScraper:
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
    
    async def extract_timestamp_from_url(self, url):
        """Try to extract timestamp from Instagram post URL"""
        # Instagram post URLs sometimes contain timestamps
        # Example: /p/ABC123/ or /reel/ABC123/
        if '/p/' in url or '/reel/' in url:
            # Extract post ID
            post_id = re.search(r'/(?:p|reel)/([^/]+)/', url)
            if post_id:
                return {
                    "post_id": post_id.group(1),
                    "url": url,
                    "message": "Post found but timestamp not directly accessible"
                }
        return None
    
    async def get_recent_post_timestamp(self, username):
        """
        Get the timestamp of the most recent post from an Instagram account
        """
        try:
            # Navigate to the Instagram profile
            profile_url = f"https://www.instagram.com/{username}/"
            await self.page.goto(profile_url, wait_until='networkidle')
            await self.page.wait_for_timeout(3000)
            
            # Check if we got redirected to login page
            if "accounts/login" in self.page.url:
                return {"error": "Account is private or requires login", "success": False}
            
            # Look for posts with different selectors
            selectors_to_try = [
                'article a[href*="/p/"]',
                'a[href*="/p/"]',
                'article a[href*="/reel/"]',
                'a[href*="/reel/"]',
                'div[role="button"]'
            ]
            
            posts_found = []
            for selector in selectors_to_try:
                posts = await self.page.query_selector_all(selector)
                if posts:
                    posts_found.extend(posts)
            
            if not posts_found:
                return {"error": "No posts found", "success": False}
            
            # Get the href of the first post
            first_post = posts_found[0]
            post_href = await first_post.get_attribute('href')
            
            if post_href:
                # Navigate directly to the post
                post_url = f"https://www.instagram.com{post_href}"
                await self.page.goto(post_url, wait_until='networkidle')
                await self.page.wait_for_timeout(2000)
                
                # Look for timestamp in multiple places
                timestamp_selectors = [
                    'time[datetime]',
                    'time',
                    '[datetime]',
                    'a[href*="/p/"] time',
                    'article time',
                    'span[title*="202"]',  # Look for spans with year in title
                    'a[title*="202"]'     # Look for links with year in title
                ]
                
                timestamp_element = None
                for selector in timestamp_selectors:
                    timestamp_element = await self.page.query_selector(selector)
                    if timestamp_element:
                        break
                
                if timestamp_element:
                    # Try to get datetime attribute first
                    datetime_attr = await timestamp_element.get_attribute('datetime')
                    if datetime_attr:
                        timestamp = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
                        return {
                            "username": username,
                            "timestamp": timestamp.isoformat(),
                            "formatted_time": timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                            "post_url": post_url,
                            "success": True
                        }
                    
                    # Try to get text content
                    text_content = await timestamp_element.text_content()
                    if text_content:
                        # Try to parse common date formats
                        date_patterns = [
                            r'(\d{1,2})/(\d{1,2})/(\d{4})',
                            r'(\d{4})-(\d{1,2})-(\d{1,2})',
                            r'(\w+ \d{1,2}, \d{4})'
                        ]
                        
                        for pattern in date_patterns:
                            match = re.search(pattern, text_content)
                            if match:
                                return {
                                    "username": username,
                                    "timestamp_text": text_content,
                                    "post_url": post_url,
                                    "message": "Found timestamp text but couldn't parse exact time",
                                    "success": False
                                }
                
                # If no timestamp found, try to extract from URL
                url_info = await self.extract_timestamp_from_url(post_url)
                if url_info:
                    url_info["username"] = username
                    url_info["success"] = False
                    return url_info
                
                return {
                    "username": username,
                    "post_url": post_url,
                    "message": "Post found but timestamp not accessible",
                    "success": False
                }
            
            return {"error": "Could not access post", "success": False}
            
        except Exception as e:
            return {"error": str(e), "success": False}
    
    async def scrape_account(self, username):
        """
        Main method to scrape an Instagram account's most recent post timestamp
        """
        try:
            await self.start_browser()
            result = await self.get_recent_post_timestamp(username)
            return result
        finally:
            await self.close_browser()

async def main():
    """Test the improved scraper with the pathenryasb account"""
    scraper = ImprovedInstagramScraper()
    username = "pathenryasb"
    
    print(f"Testing improved Instagram scraper for @{username}")
    print("=" * 50)
    
    result = await scraper.scrape_account(username)
    
    print("Results:")
    print(json.dumps(result, indent=2, default=str))
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main()) 