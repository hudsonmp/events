# Instagram Event Aggregator - Playwright Edition

**🎉 RECENTLY MIGRATED:** This project has been successfully migrated from Instaloader to Playwright for improved reliability and performance.

This automated Instagram scraper downloads and stores content from Instagram accounts using browser automation, designed specifically for event aggregation and content archival.

## ✨ Key Features

- **🎭 Playwright Automation**: Browser-based scraping for better reliability
- **☁️ Supabase Integration**: Seamless cloud storage and database management
- **📱 Content Types**: Posts, stories, profile pictures, and captions
- **🔄 Dual Mode Operation**: Hourly updates + full initialization
- **⚡ Self-Contained**: Single file solution for easy maintenance
- **🛡️ Error Resilience**: Smart retry logic and error classification
- **🚫 Reel Filtering**: Excludes reels by design for focused content

## 🏗️ Architecture

### Storage Structure
```
supabase-storage/
├── instagram-posts/         # Images and videos from posts
├── instagram-stories/       # Story content
├── instagram-profile-pics/  # User profile pictures  
└── instagram-captions/      # Post captions as text files
```

### Operating Modes

#### 🕐 Hourly Mode (Automated)
- **Trigger**: GitHub Actions cron schedule
- **Scope**: Recent posts (last 10 per account)
- **Purpose**: Keep content up-to-date

#### 🚀 Initialization Mode (Manual)
- **Trigger**: Local execution
- **Scope**: Last 3 months of content
- **Purpose**: Initial setup or backfill

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Supabase account with project setup
- Environment variables configured

### Installation
```bash
# Install dependencies
pip install -r requirements_playwright.txt

# Install Playwright browser
playwright install chromium

# Set environment variables
export SUPABASE_PROJECT_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE="your_service_role_key"
```

### Run Locally
```bash
python instagram_playwright_scraper.py
```

## � Setup Guide

### 1. Create Supabase Storage Buckets

**Go to**: [Supabase Dashboard Storage](https://app.supabase.com/project/YOUR_PROJECT/storage/buckets)

Create these 4 buckets with public access:

1. **`instagram-posts`**
   - Purpose: Images and videos from posts
   - Public: ✅ Yes

2. **`instagram-stories`**  
   - Purpose: Story content
   - Public: ✅ Yes

3. **`instagram-profile-pics`**
   - Purpose: User profile pictures
   - Public: ✅ Yes

4. **`instagram-captions`**
   - Purpose: Post captions as text files
   - Public: ✅ Yes

### 2. Configure GitHub Secrets

**Go to**: Repository Settings → Secrets and Variables → Actions

Add these secrets:
- `SUPABASE_PROJECT_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE`: Your Supabase service role key

### 3. Database Setup

Create the required table in your Supabase database:

```sql
CREATE TABLE usernames (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    school_id INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

Add your target usernames:
```sql
INSERT INTO usernames (username) VALUES 
    ('account1'),
    ('account2'),
    ('account3');
```

## � How It Works

### Initialization Process
1. **Browser Launch**: Starts headless Chromium browser
2. **Profile Extraction**: Gets profile data and statistics
3. **Content Discovery**: Finds posts from last 3 months
4. **Media Download**: Downloads images/videos using aiohttp
5. **Storage Upload**: Uploads everything to Supabase storage
6. **Caption Processing**: Saves captions as separate text files

### Hourly Updates
1. **Quick Profile Check**: Updates profile information
2. **Recent Posts**: Gets last 10 posts per account
3. **Smart Filtering**: Excludes already processed content
4. **Efficient Storage**: Only uploads new content

## ⚙️ Configuration

### Rate Limiting
```python
self.request_delay = 2.0      # Seconds between requests
self.max_retries = 3          # Retry attempts for failed operations
```

### Content Filtering
- ✅ **Included**: Posts, Stories, Profile Pictures, Captions
- ❌ **Excluded**: Reels (by design)
- 🕒 **Time Limit**: Last 3 months for initialization

## 📊 Monitoring

### Success Metrics
- Accounts processed successfully
- Posts downloaded per execution  
- Error rates and types
- Storage utilization

### Logs Location
- **Local**: Console output with timestamps
- **GitHub Actions**: Workflow run logs
- **Errors**: Uploaded as artifacts on failure

## 🔍 Data Access

### Storage Buckets
1. Go to [Supabase Storage](https://app.supabase.com/project/YOUR_PROJECT/storage/buckets)
2. Browse individual buckets for content
3. Download files or get public URLs

### Database Queries
```sql
-- View all usernames
SELECT * FROM usernames ORDER BY username;

-- Check recent activity (if using optional metadata tables)
SELECT username, COUNT(*) as post_count 
FROM instagram_posts 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY username;
```

## 🛠️ Troubleshooting

### Common Issues

#### Browser Launch Failures
```bash
# Install system dependencies
sudo apt-get install -y libwoff1 libopus0 libgstreamer1.0
```

#### DOM Selector Updates
Instagram occasionally changes their page structure. Update selectors in:
- `_get_profile_data()` method
- `_extract_post_data()` method

#### Rate Limiting
If you hit rate limits, increase the delay:
```python
self.request_delay = 3.0  # Increase from 2.0
```

### Getting Help

1. **Check Logs**: Review execution logs for specific errors
2. **Verify Setup**: Ensure all environment variables are set
3. **Test Locally**: Run initialization mode on single account
4. **Check Storage**: Verify Supabase buckets are created correctly

## 📈 Usage Instructions

### Adding New Accounts
1. Add usernames to the `usernames` table in Supabase:
```sql
INSERT INTO usernames (username) VALUES ('new_account');
```

### Manual Execution
```bash
# Full initialization for all accounts
python instagram_playwright_scraper.py

# The script will prompt for single account vs. all accounts
```

### Monitoring Automation
- GitHub Actions runs automatically every hour
- Check the Actions tab for execution status
- Review logs for any failures or issues

## � Migration Details

This project was recently migrated from Instaloader to Playwright. See [`MIGRATION_README.md`](MIGRATION_README.md) for complete technical details, including:

- Architecture differences
- Performance improvements  
- Serverless function requirements
- Troubleshooting guide
- Maintenance procedures

## 📜 Legal & Ethics

- ✅ **Public Content Only**: Only scrapes publicly available posts
- ✅ **Educational Purpose**: Designed for event aggregation and archival
- ✅ **Rate Limited**: Respects Instagram's servers with delays
- ⚠️ **Terms Compliance**: Review Instagram's Terms of Service
- ⚠️ **Permission Required**: Ensure you have rights to scrape target accounts

## 🏷️ Version

- **Current Version**: 2.0.0 (Playwright Edition)
- **Previous Version**: 1.x (Instaloader Edition - Deprecated)
- **Migration Date**: 2025
- **Python Support**: 3.11+

---

**Status**: ✅ **Active & Maintained**  
**Last Updated**: January 2025  
**Technology Stack**: Python 3.11 + Playwright + Supabase + GitHub Actions