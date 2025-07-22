# Simple Instagram Scraper

A simple Instagram scraper that extracts the timestamp of the most recent post from any Instagram account.

## Features

- Scrapes the most recent post timestamp from Instagram accounts
- Uses Playwright for reliable web scraping
- Handles different Instagram page layouts
- Returns structured JSON data

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

2. Install Playwright browsers:
```bash
playwright install
```

## Usage

### Basic Usage

```python
import asyncio
from instagram_scraper import InstagramScraper

async def main():
    scraper = InstagramScraper()
    result = await scraper.scrape_account("instagram")
    print(result)

asyncio.run(main())
```

### Running the Test Script

```bash
python test_scraper.py
```

### Running the Main Scraper

```bash
python instagram_scraper.py
```

## Output Format

The scraper returns a dictionary with the following structure:

```json
{
  "username": "instagram",
  "timestamp": "2024-01-15T10:30:00+00:00",
  "formatted_time": "2024-01-15 10:30:00 UTC",
  "success": true
}
```

Or in case of errors:

```json
{
  "error": "Error message",
  "success": false
}
```

## Notes

- The scraper runs in headless mode by default
- It includes delays to avoid rate limiting
- Instagram may block automated access, so use responsibly
- The scraper is for testing purposes only

## Limitations

- Instagram may change their page structure, requiring updates to selectors
- Rate limiting and blocking may occur with frequent use
- Some accounts may have different layouts that require additional handling 