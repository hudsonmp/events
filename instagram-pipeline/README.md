# Instagram Scraping Pipeline

A comprehensive Instagram scraping system using Instagrapi and Supabase for automated profile and post data collection.

## Overview

This pipeline consists of three main components:

1. **`main.py`** - The orchestrator that coordinates the entire scraping process
2. **`scraper.py`** - Handles all Instagram API interactions via Instagrapi
3. **`store.py`** - Manages Supabase database operations and storage uploads

## Features

- **Profile Management**: Updates profile pictures, bio, follower counts, and other metadata
- **Post Scraping**: Collects new posts with captions and images
- **Deduplication**: Prevents duplicate posts from being stored
- **Storage Integration**: Uploads all content to Supabase storage buckets
- **Rate Limiting**: Intelligent handling of Instagram's rate limits
- **Session Management**: Persistent Instagram login sessions
- **Error Handling**: Comprehensive error handling and logging
- **One Month Limit**: Hard stop at posts older than one month

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the project root with:

```env
# Instagram Credentials
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# Supabase Configuration
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your_service_role_key
```

### 3. Database Setup

Ensure your Supabase database has the following tables:

#### `profiles` table:
- `id` (uuid, primary key)
- `username` (text)
- `school_id` (uuid)
- `profile_pic_url` (text)
- `bio` (text)
- `followers` (integer)
- `full_name` (text)
- `is_verified` (boolean)
- `is_private` (boolean)
- `mediacount` (integer)
- `last_seen_shortcode` (text)
- `last_updated` (timestamp)
- `created_at` (timestamp)

#### `posts` table:
- `id` (uuid, primary key)
- `shortcode` (text, unique)
- `username_id` (uuid, foreign key to profiles)
- `caption_path` (text)
- `posted_at` (timestamp)
- `processed` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `post_images` table:
- `id` (uuid, primary key)
- `post_id` (uuid, foreign key to posts)
- `file_path` (text)
- `created_at` (timestamp)

### 4. Storage Buckets

The pipeline uses two Supabase storage buckets:
- `instagram_profiles` - For profile pictures
- `instagram_posts` - For post captions and images

## Usage

### Running the Pipeline

```bash
cd instagram-pipeline
python main.py
```

### What Happens

1. **Profile Loading**: Loads all profiles from the `profiles` table
2. **For each profile**:
   - Fetches current profile information from Instagram
   - Updates profile picture if changed
   - Scrapes new posts (stopping at `last_seen_shortcode`)
   - Uploads captions and images to Supabase storage
   - Updates database with new post metadata
   - Updates `last_seen_shortcode` checkpoint

### File Structure

```
instagram-pipeline/
├── main.py              # Main orchestrator
├── scraper.py           # Instagram API handler
├── store.py             # Supabase storage manager
├── requirements.txt     # Dependencies
├── README.md           # This file
└── instagram_session.json  # Instagram session (auto-generated)
```

### Storage Structure

#### Profile Pictures:
```
instagram_profiles/
└── {username}/
    └── profile.jpg
```

#### Posts:
```
instagram_posts/
└── {shortcode}/
    ├── caption.txt
    ├── image_1.jpg
    ├── image_2.jpg
    └── ...
```

## Logging

The pipeline creates detailed logs in:
- `instagram_scraper.log` - File log
- Console output - Real-time progress

## Error Handling

- **Rate Limiting**: Automatic exponential backoff
- **Authentication**: Session persistence and re-authentication
- **Network Errors**: Retry logic with delays
- **Private Accounts**: Automatically skipped
- **Missing Data**: Graceful handling of missing captions/images

## Security Features

- **Session Management**: Reuses Instagram sessions to avoid frequent logins
- **Rate Limiting**: Respects Instagram's rate limits
- **Random Delays**: Prevents detection as automated scraping
- **Error Recovery**: Continues processing even if individual accounts fail

## Monitoring

Monitor the pipeline through:
- Log files for detailed operation history
- Database queries to check progress
- Storage bucket contents for uploaded files

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Check Instagram credentials
   - Delete `instagram_session.json` and retry

2. **Rate Limiting**:
   - Pipeline will automatically handle this
   - Consider reducing frequency of runs

3. **Storage Upload Failures**:
   - Check Supabase credentials
   - Verify storage bucket permissions

4. **Database Connection Issues**:
   - Verify Supabase URL and service role key
   - Check database table structures

### Best Practices

- Run the pipeline during off-peak hours
- Monitor Instagram account for any restrictions
- Regularly check logs for errors
- Keep dependencies updated
- Backup your database regularly

## Limitations

- Only processes public Instagram accounts
- Limited to posts from the last month
- Subject to Instagram's rate limits
- Requires valid Instagram credentials 