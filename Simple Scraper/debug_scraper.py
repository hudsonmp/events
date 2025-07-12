import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime

class InstagramDebugScraper:
    def __init__(self):
        self.browser = None
        self.page = None
    
    async def start_browser(self):
        """Start the browser and create a new page"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=False)  # Set to False for debugging
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
    
    async def debug_scrape_account(self, username):
        """
        Debug version of the scraper that shows what's happening
        """
        try:
            await self.start_browser()
            
            # Navigate to the Instagram profile
            profile_url = f"https://www.instagram.com/{username}/"
            print(f"Navigating to: {profile_url}")
            
            await self.page.goto(profile_url, wait_until='networkidle')
            await self.page.wait_for_timeout(5000)  # Wait longer for debugging
            
            print(f"Current URL: {self.page.url}")
            
            # Check if we got redirected to login page
            if "accounts/login" in self.page.url:
                print("ERROR: Redirected to login page - account might be private")
                return {"error": "Account is private or requires login", "success": False}
            
            # Take a screenshot for debugging
            await self.page.screenshot(path=f"debug_{username}.png")
            print(f"Screenshot saved as debug_{username}.png")
            
            # Look for posts with different selectors
            selectors_to_try = [
                'article a',
                'a[href*="/p/"]',
                'div[role="button"]',
                'a[href*="/reel/"]'
            ]
            
            posts_found = []
            for selector in selectors_to_try:
                posts = await self.page.query_selector_all(selector)
                print(f"Selector '{selector}' found {len(posts)} elements")
                if posts:
                    posts_found.extend(posts)
            
            if not posts_found:
                print("No posts found with any selector")
                return {"error": "No posts found", "success": False}
            
            print(f"Found {len(posts_found)} potential post elements")
            
            # Try to click on the first post
            try:
                await posts_found[0].click()
                await self.page.wait_for_timeout(3000)
                print(f"Clicked on first post. Current URL: {self.page.url}")
                
                # Look for timestamp
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
                        print(f"Found timestamp with selector: {selector}")
                        break
                
                if timestamp_element:
                    datetime_attr = await timestamp_element.get_attribute('datetime')
                    if datetime_attr:
                        timestamp = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
                        return {
                            "username": username,
                            "timestamp": timestamp.isoformat(),
                            "formatted_time": timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                            "success": True
                        }
                
                print("No timestamp found in post modal")
                return {
                    "username": username,
                    "url": self.page.url,
                    "message": "Post found but timestamp not accessible",
                    "success": False
                }
                
            except Exception as e:
                print(f"Error clicking on post: {str(e)}")
                return {"error": f"Error clicking on post: {str(e)}", "success": False}
            
        except Exception as e:
            print(f"General error: {str(e)}")
            return {"error": str(e), "success": False}
        finally:
            await self.close_browser()

async def main():
    """Debug the scraper with the pathenryasb account"""
    scraper = InstagramDebugScraper()
    username = "pathenryasb"
    
    print(f"Debugging Instagram scraper for @{username}")
    print("=" * 50)
    
    result = await scraper.debug_scrape_account(username)
    
    print("Results:")
    print(json.dumps(result, indent=2, default=str))
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main()) 