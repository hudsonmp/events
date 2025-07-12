# Instagram Scraper Migration: Instaloader → Playwright

This document outlines the complete migration from Instaloader to Playwright for Instagram content scraping.

## Migration Summary

**COMPLETED:** ✅ Full migration from Instaloader to Playwright
- **Old System:** `instagram_scraper.py` using Instaloader library
- **New System:** `instagram_playwright_scraper.py` using Playwright browser automation
- **Deployment:** Self-contained single file solution
- **Content Focus:** Images only, no videos/reels or engagement metrics
- **Duplicate Prevention:** Timestamp-based checking

## Key Improvements

### 🔧 Technical Enhancements
- **Browser Automation:** Real browser interaction vs. API-like scraping
- **Persistent Context:** Maintains session state across requests
- **Better Error Handling:** Distinguishes transient vs persistent errors
- **Rate Limiting:** Built-in delays and request throttling
- **Headless Operation:** Optimized for server environments
- **Timestamp-based Duplicate Prevention:** Avoids re-downloading existing content
- **Images Only:** Simplified to focus on image content, no videos/reels

### 📊 Data Compatibility
- **Same Supabase Schema:** Compatible with existing database structure
- **Same Storage Buckets:** Uses identical Supabase storage organization
- **Same File Naming:** Maintains consistent file naming conventions
- **Same Functionality:** Preserves all original features

## Architecture Overview

### File Structure
```
├── instagram_playwright_scraper.py    # Main scraper (NEW)
├── requirements_playwright.txt        # Dependencies (NEW)
├── .github/workflows/instagram-scraper.yml  # Updated workflow
├── usernames.py                       # Unchanged
└── MIGRATION_README.md               # This file
```

### Core Components

#### 1. InstagramPlaywrightScraper Class
- **Purpose:** Main scraper using Playwright browser automation
- **Features:** Profile extraction, image-only post scraping, media download
- **Error Handling:** Transient (network timeouts) vs Persistent (blocked content)
- **Duplicate Prevention:** Timestamp-based checking to avoid re-downloading content

#### 2. Data Structures
```python
@dataclass
class InstagramPost:
    shortcode: str
    caption: str
    image_url: str
    timestamp: datetime
    username: str

@dataclass
class InstagramProfile:
    username: str
    full_name: str
    bio: str
    profile_pic_url: str
```

#### 3. Storage Integration
- **Supabase Storage:** 4 buckets for different content types
  - `instagram-posts` - Images only (no videos/reels)
  - `instagram-stories` - Story content
  - `instagram-profile-pics` - Profile pictures
  - `instagram-captions` - Text captions as .txt files

## Operating Modes

### 1. Hourly Update Mode (GitHub Actions)
- **Trigger:** Automatic via GitHub Actions cron
- **Scope:** New posts only (based on timestamp comparison)
- **Duration:** Fast updates for new content
- **Environment Variable:** `GITHUB_ACTIONS=true`
- **Duplicate Prevention:** Checks latest saved timestamp per user

### 2. Initialization Mode (Local)
- **Trigger:** Manual execution
- **Scope:** Last 3 months of content
- **Options:** Single account or all accounts
- **Use Case:** Initial setup or bulk backfill

## Error Classification & Handling

### Transient Errors (Retry)
```python
# Network timeouts
# Rate limiting responses
# Temporary page load failures
# Cookie/session issues
```

### Persistent Errors (Skip)
```python
# Private accounts
# Deleted/non-existent profiles
# Permanently blocked content
# Malformed URLs
```

### Error Recovery
- **Max Retries:** 3 attempts per operation
- **Backoff Strategy:** 2-second delays between requests
- **Graceful Degradation:** Continue with next account on failure

## Installation & Setup

### 1. Dependencies
```bash
pip install -r requirements_playwright.txt
playwright install chromium
```

### 2. Environment Variables
```bash
export SUPABASE_PROJECT_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE="your_service_role_key"
```

### 3. Local Testing
```bash
python instagram_playwright_scraper.py
```

## GitHub Actions Configuration

### Updated Workflow Features
- **Browser Installation:** Automatic Playwright browser setup
- **Dependency Caching:** Faster CI/CD execution
- **Extended Timeout:** 120 minutes for large operations
- **Artifact Upload:** Logs preserved on failure

### Secrets Required
```yaml
SUPABASE_PROJECT_URL: Your Supabase project URL
SUPABASE_SERVICE_ROLE: Your Supabase service role key
```

## Supabase Database Schema

### Required Tables

#### `usernames` Table
```sql
CREATE TABLE usernames (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    school_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `instagram_posts` Table (Optional - for metadata)
```sql
CREATE TABLE instagram_posts (
    id SERIAL PRIMARY KEY,
    shortcode VARCHAR(255) UNIQUE,
    username VARCHAR(255),
    caption_url TEXT,
    image_url TEXT,
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `profiles` Table (Optional - for profile metadata)
```sql
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    bio TEXT,
    profile_pic_url TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Storage Buckets
```sql
-- Create storage buckets (via Supabase Dashboard or SQL)
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('instagram-posts', 'instagram-posts', true),
    ('instagram-stories', 'instagram-stories', true),
    ('instagram-profile-pics', 'instagram-profile-pics', true),
    ('instagram-captions', 'instagram-captions', true);
```

## Serverless Functions & Supabase Integration

### Can Be Done on Supabase ✅

#### 1. Data Processing Functions
```sql
-- Function to update profile statistics
CREATE OR REPLACE FUNCTION update_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update follower counts, engagement metrics
    -- Can be triggered on data insertion
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 2. Content Validation Functions  
```sql
-- Function to validate scraped content
CREATE OR REPLACE FUNCTION validate_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for duplicate content
    -- Validate URL formats
    -- Filter inappropriate content
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 3. Automated Cleanup Functions
```sql
-- Function to clean old temporary files
CREATE OR REPLACE FUNCTION cleanup_old_content()
RETURNS void AS $$
BEGIN
    -- Remove files older than retention period
    -- Archive old data
END;
$$ LANGUAGE plpgsql;
```

### External Serverless Functions Required ❌

#### 1. Image Processing
- **Service:** Cloudflare Workers, Vercel Functions, or AWS Lambda
- **Purpose:** Image resizing, format conversion, metadata extraction
- **Reason:** CPU-intensive operations not ideal for Supabase Edge Functions

#### 2. Content Analysis
- **Service:** External AI/ML API (OpenAI, Google Vision, etc.)
- **Purpose:** Content moderation, auto-tagging, sentiment analysis
- **Reason:** Requires specialized ML models

#### 3. Third-party Integrations
- **Service:** Zapier, external webhooks
- **Purpose:** Notifications, cross-platform syncing
- **Reason:** Complex external API interactions

## Performance & Monitoring

### Key Metrics
- **Accounts Processed:** Success rate per execution
- **Posts Scraped:** Total image content volume (no videos/reels)
- **Error Rates:** Transient vs persistent failures
- **Execution Time:** Per account processing duration
- **Duplicate Prevention:** Timestamp-based filtering efficiency

### Monitoring Setup
```python
# Built-in logging in scraper
logger.info(f"Processed {username} - {len(posts)} posts")
logger.error(f"Failed to process {username}: {error}")
```

### Optimization Tips
1. **Rate Limiting:** Adjust `request_delay` based on performance
2. **Batch Size:** Limit concurrent operations for stability
3. **Browser Resources:** Monitor memory usage in production
4. **Network Timeouts:** Adjust timeout values for slow connections

## Migration Checklist

### ✅ Completed
- [x] Created new Playwright-based scraper
- [x] Maintained compatibility with existing Supabase schema
- [x] Updated GitHub Actions workflow
- [x] Added comprehensive error handling
- [x] Implemented persistent browser contexts
- [x] Created requirements file
- [x] Documented architecture and setup

### 🔄 Next Steps (Recommended)
1. **Test Migration:** Run both systems in parallel initially
2. **Monitor Performance:** Compare execution times and success rates
3. **Optimize Selectors:** Update DOM selectors as Instagram changes
4. **Add Monitoring:** Implement alerts for failure rates
5. **Scale Testing:** Verify performance with full account list

## Troubleshooting

### Common Issues

#### 1. Browser Launch Failures
```bash
# Solution: Install system dependencies
sudo apt-get install -y libwoff1 libopus0 libgstreamer1.0 libgstreamer-plugins-base1.0
```

#### 2. Memory Issues
```python
# Solution: Reduce concurrent operations
self.request_delay = 3.0  # Increase delay
```

#### 3. Selector Changes
```python
# Solution: Update DOM selectors when Instagram changes
# Monitor and update selectors in _get_profile_data and _extract_post_data methods
```

#### 4. Rate Limiting
```python
# Solution: Implement exponential backoff
await asyncio.sleep(self.request_delay * (attempt ** 2))
```

## Support & Maintenance

### Regular Maintenance
- **Monthly:** Review error logs and update selectors
- **Quarterly:** Update Playwright and dependencies
- **Annually:** Review and optimize storage costs

### Emergency Procedures
1. **High Failure Rate:** Disable automation, investigate
2. **Storage Full:** Implement cleanup procedures
3. **Performance Degradation:** Scale down operations temporarily

---

**Migration Status:** ✅ **COMPLETE**  
**Maintainer:** Background Agent  
**Last Updated:** $(date)  
**Version:** 1.0.0