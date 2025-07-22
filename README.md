# Instagram Scraper for Patrick Henry High School

This automated Instagram scraper downloads and stores content from Patrick Henry High School's Instagram accounts in Supabase storage.

## 🎯 Features

- **Dual Mode Operation**: Initialization (3 months) vs Hourly Updates
- **Caption Storage**: Automatically extracts and saves post captions as text files
- **Smart Content Filtering**: Downloads posts, stories, and profile pictures (excludes reels)
- **Organized Storage**: Files are categorized into separate storage buckets
- **Automated Execution**: Runs every hour via GitHub Actions

## 📁 Storage Structure

The scraper organizes content into **4 storage buckets**:

```
instagram-posts/          # Images and videos from posts
├── username1/
│   ├── phhs_athletics_2025-01-20_14-30-45_GraphImage_B1a2C3d4.jpg
│   └── pathenry2026_2025-01-20_15-45-12_GraphVideo_C2b3D4e5.mp4
└── username2/...

instagram-stories/        # Story content (24-hour expiring)
├── username1/
│   ├── phhs_athletics_2025-01-20_16-20-10_StoryImage_D3c4E5f6.jpg
│   └── phhsmun_2025-01-20_17-10-30_StoryVideo_E4d5F6g7.mp4
└── username2/...

instagram-profile-pics/   # Profile pictures
├── username1/
│   └── phhs_athletics_2025-01-20_12-00-00_profile_pic.jpg
└── username2/...

instagram-captions/       # Post captions as text files
├── username1/
│   ├── phhs_athletics_2025-01-20_14-30-45_caption_B1a2C3d4.txt
│   └── pathenry2026_2025-01-20_15-45-12_caption_C2b3D4e5.txt
└── username2/...
```

## 🔧 Setup Instructions

### 1. Create Supabase Storage Buckets

**Go to**: [Supabase Dashboard Storage](https://app.supabase.com/project/zofjzjdtqksqugahotcs/storage/buckets)

**Create these 4 buckets** (click "New bucket" for each):

1. **`instagram-posts`**
   - Name: `instagram-posts`
   - Public: ✅ (checked)
   - File size limit: 50MB
   - Allowed MIME types: Leave empty (all types)

2. **`instagram-stories`**
   - Name: `instagram-stories`
   - Public: ✅ (checked)
   - File size limit: 50MB
   - Allowed MIME types: Leave empty (all types)

3. **`instagram-profile-pics`**
   - Name: `instagram-profile-pics`
   - Public: ✅ (checked)
   - File size limit: 10MB
   - Allowed MIME types: Leave empty (all types)

4. **`instagram-captions`**
   - Name: `instagram-captions`
   - Public: ✅ (checked)
   - File size limit: 1MB
   - Allowed MIME types: `text/plain`

> **Important**: All buckets must be set to **Public** so the URLs are accessible.

### 2. Database Setup

The scraper uses these existing tables:
- `schools` - Contains Patrick Henry High School info
- `usernames` - Contains all Instagram usernames to scrape

## 🚀 Usage

### Local Initialization (Run Once)

```bash
python instagram_scraper.py
```

**Interactive prompts:**
- Choose single account or all accounts (34 total)
- Downloads last 3 months of content
- Uploads everything to Supabase storage
- Saves captions as separate text files

### Automatic Hourly Updates

- GitHub Actions runs automatically every hour
- Downloads only new content (fast-update mode)
- Processes all accounts from the Supabase database
- No user interaction required

## 📋 What Gets Downloaded

### ✅ Included Content:
- **Posts**: Images and videos from regular posts
- **Stories**: Current stories (24-hour content)
- **Profile Pictures**: Current profile images
- **Captions**: Post captions saved as `.txt` files

### ❌ Excluded Content:
- **Reels**: Explicitly excluded from downloads
- **Comments**: Not downloaded
- **IGTV**: Not specifically targeted
- **Highlights**: Not included

## 🗂️ File Naming Convention

All files follow this pattern:
```
{username}_{date_utc}_{type}_{shortcode}.{extension}

Examples:
- phhs_athletics_2025-01-20_14-30-45_GraphImage_B1a2C3d4.jpg
- pathenry2026_2025-01-20_15-45-12_caption_C2b3D4e5.txt
- phhsmun_2025-01-20_16-20-10_StoryVideo_D3c4E5f6.mp4
```

## 🛡️ Error Handling

- **Individual Failures**: Script continues if one account fails
- **Storage Fallbacks**: Continues even if some uploads fail
- **Duplicate Prevention**: Fast-update mode prevents re-downloading
- **Comprehensive Logging**: Detailed logs for troubleshooting

## 📊 Monitoring

### Check GitHub Actions:
1. Go to the **Actions** tab in your repository
2. View the "scrape-instagram" workflow
3. Check logs for any errors or successful runs

### Check Storage Usage:
1. Go to [Supabase Storage](https://app.supabase.com/project/zofjzjdtqksqugahotcs/storage/buckets)
2. Click on each bucket to see uploaded files
3. Monitor storage usage and costs

## 🔄 Profile Changes

The system automatically handles:
- **Username Changes**: Instaloader detects and handles renames
- **Profile Pictures**: New profile pics are downloaded
- **Content Updates**: New posts and stories are captured

## 📈 Scaling

Currently configured for **34 Instagram accounts** from Patrick Henry High School. To add more accounts:

1. Add usernames to the `usernames` table in Supabase
2. The scraper will automatically include them in the next run

## 🎮 Testing

### Test Locally:
```bash
python instagram_scraper.py
```

### Test GitHub Actions:
1. Go to **Actions** tab
2. Click "scrape-instagram" workflow
3. Click "Run workflow" button
4. Monitor the execution logs

---

## 📋 Account List

The scraper currently processes these Patrick Henry High School accounts:

- `pathenryasb`, `phhspatriotsvolleyball`, `pathenry2026`, `phhsmun`
- `pathenry2028`, `henrymodelun`, `patrick_henry_wrestling`, `phhs_athletics`
- `phhsboyslacrosse`, `henryyearbook`, `henryfootball1`, `phhscollege25`
- `phhs.youngwomeninmedicine`, `pathenrymascot`, `pathenry2025`, `phhswomensoccer`
- `phhs.girlsflag`, `phhsenviro`, `henry_powderpuff`, `phhsmarchingband`
- `patrickhenrywaterboys`, `phhsavid`, `phhs.blackboxtheaterco`, `phhscolorguard`
- `phhscheer`, `phhs.swear`, `patrickhenrypolomamis`, `phhsdanceteam`
- `phhs.mocktrial`, `phhsthriftstore`, `phhs.swim`, `linkcrewphhs`
- `phhs_theatre`, `phhs.patsplace`

Ready to capture your school's digital memories! 🎓📸