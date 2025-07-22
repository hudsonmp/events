import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime

class InstagramPostScraper:
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

    async def get_recent_post_details(self, username):
        try:
            profile_url = f"https://www.instagram.com/{username}/"
            await self.page.goto(profile_url, wait_until='networkidle')
            await self.page.wait_for_timeout(3000)

            # Find the first post link
            post_links = await self.page.query_selector_all('article a[href*="/p/"]')
            if not post_links:
                return {"error": "No posts found"}

            post_href = await post_links[0].get_attribute('href')
            if not post_href:
                return {"error": "Could not get post link"}

            post_url = f"https://www.instagram.com{post_href}"
            await self.page.goto(post_url, wait_until='networkidle')
            await self.page.wait_for_timeout(2000)

            # Get timestamp
            timestamp = None
            time_elem = await self.page.query_selector('time[datetime]')
            if time_elem:
                datetime_attr = await time_elem.get_attribute('datetime')
                if datetime_attr:
                    timestamp = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00')).isoformat()

            # Get image URL
            image_url = None
            img_elem = await self.page.query_selector('article img')
            if img_elem:
                image_url = await img_elem.get_attribute('src')

            # Get caption
            caption = None
            # Instagram captions are often in the first <span> inside the article
            caption_elem = await self.page.query_selector('article div[role="button"] span, article ul li div div div span')
            if caption_elem:
                caption = await caption_elem.inner_text()

            # Get title (Instagram doesn't have a strict 'title', but we can use the alt text of the image if available)
            title = None
            if img_elem:
                title = await img_elem.get_attribute('alt')

            return {
                "username": username,
                "post_url": post_url,
                "timestamp": timestamp,
                "image_url": image_url,
                "caption": caption,
                "title": title,
                "success": True
            }
        except Exception as e:
            return {"error": str(e), "success": False}

    async def scrape_account(self, username):
        try:
            await self.start_browser()
            result = await self.get_recent_post_details(username)
            return result
        finally:
            await self.close_browser()

async def main():
    scraper = InstagramPostScraper()
    test_username = "pathenryasb"  # Change to any username you want to test
    print(f"Scraping most recent post details for @{test_username}...")
    result = await scraper.scrape_account(test_username)
    print("Results:")
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main()) 