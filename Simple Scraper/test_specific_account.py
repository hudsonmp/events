import asyncio
import json
from instagram_scraper import InstagramScraper

async def test_specific_account():
    """Test the Instagram scraper with the pathenryasb account"""
    
    username = "pathenryasb"
    
    print(f"Testing Instagram scraper for @{username}")
    print("=" * 50)
    
    scraper = InstagramScraper()
    result = await scraper.scrape_account(username)
    
    print("Results:")
    print(json.dumps(result, indent=2, default=str))
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(test_specific_account()) 