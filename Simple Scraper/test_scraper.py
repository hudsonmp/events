import asyncio
import json
from instagram_scraper import InstagramScraper

async def test_scraper(username):
    """
    Test the Instagram scraper with a given username
    
    Args:
        username (str): Instagram username to test (without @)
    """
    print(f"Testing Instagram scraper for @{username}")
    print("=" * 50)
    
    scraper = InstagramScraper()
    result = await scraper.scrape_account(username)
    
    print("Results:")
    print(json.dumps(result, indent=2, default=str))
    print("=" * 50)
    print()

async def main():
    """Test the scraper with multiple accounts"""
    
    # Test accounts (you can modify this list)
    test_accounts = [
        "instagram",  # Instagram's official account
        "natgeo",     # National Geographic
        "nike"        # Nike
    ]
    
    print("Instagram Scraper Test")
    print("=" * 50)
    
    for account in test_accounts:
        try:
            await test_scraper(account)
        except Exception as e:
            print(f"Error testing @{account}: {str(e)}")
            print()

if __name__ == "__main__":
    asyncio.run(main()) 