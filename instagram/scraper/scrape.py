import asyncio, json, os, re
from datetime import datetime, timedelta, timezone
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv
import io

# Load environment variables
load_dotenv()

STATE = "instagram/files/instagram_cookies.json"
SCHOOL_ID = "00000000-0000-0000-0000-000000000001"  # Patrick Henry High School

# Supabase setup
supabase_url = os.getenv("SUPABASE_PROJECT_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE")
supabase: Client = create_client(supabase_url, supabase_key)

def extract_shortcode_from_url(url):
    """Extract Instagram shortcode from URL like /p/ABC123/"""
    if not url:
        return None
    match = re.search(r'/p/([^/]+)/', url)
    return match.group(1) if match else None

def is_post_recent_enough(post_date, months_threshold=3):
    """Check if post is within the specified months threshold"""
    if not post_date:
        return False
    
    # Get current date in UTC
    current_date_utc = datetime.now(timezone.utc).date()
    cutoff_date = current_date_utc - timedelta(days=months_threshold * 30)
    
    # Extract just the date part from post_date
    post_date_only = post_date.date()
    
    return post_date_only >= cutoff_date

async def file_exists_in_storage(filepath, bucket_name):
    """Check if file already exists in Supabase storage"""
    try:
        result = supabase.storage.from_(bucket_name).list(path=os.path.dirname(filepath))
        if result:
            filename = os.path.basename(filepath)
            existing_files = [file['name'] for file in result]
            return filename in existing_files
        return False
    except Exception as e:
        print(f"❌ Error checking file existence: {e}")
        return False

async def extract_post_date(dialog):
    """Extract post date from Instagram time element"""
    try:
        # Look for time element with datetime attribute
        time_elements = dialog.locator('time[datetime]')
        time_count = await time_elements.count()
        
        if time_count > 0:
            # Get the datetime attribute from the first time element
            datetime_attr = await time_elements.first.get_attribute("datetime")
            if datetime_attr:
                # Parse ISO format datetime and assume UTC timezone
                post_date = datetime.fromisoformat(datetime_attr.replace('Z', '+00:00'))
                
                # Ensure it's in UTC timezone
                if post_date.tzinfo is None:
                    post_date = post_date.replace(tzinfo=timezone.utc)
                else:
                    post_date = post_date.astimezone(timezone.utc)
                
                print(f"📅 Post date extracted: {post_date.strftime('%Y-%m-%d')}")
                return post_date
        
        print("❌ Could not find post date")
        return None
        
    except Exception as e:
        print(f"❌ Error extracting post date: {e}")
        return None

async def get_all_profiles():
    """Get all profiles from the database"""
    try:
        result = supabase.table('profiles').select('*').execute()
        profiles = result.data
        print(f"✅ Found {len(profiles)} profiles to process")
        return profiles
    except Exception as e:
        print(f"❌ Error fetching profiles: {e}")
        return []

async def update_profile_last_seen(profile_id, shortcode):
    """Update the last_seen_shortcode for a profile"""
    try:
        result = supabase.table('profiles').update({
            'last_seen_shortcode': shortcode,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }).eq('id', profile_id).execute()
        
        if result.data:
            print(f"✅ Updated last_seen_shortcode to {shortcode}")
        return result.data
    except Exception as e:
        print(f"❌ Error updating profile: {e}")
        return None

async def check_post_exists(shortcode):
    """Check if post already exists in database"""
    try:
        result = supabase.table('posts').select('*').eq('shortcode', shortcode).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"❌ Error checking post existence: {e}")
        return False

async def should_stop_scraping(shortcode, last_seen_shortcode):
    """Check if we should stop scraping based on last seen shortcode"""
    if not last_seen_shortcode:
        return False
    return shortcode == last_seen_shortcode

async def create_post_record(shortcode, username_id, post_date, caption_path=None):
    """Create new post record in database with actual post date"""
    try:
        new_post = {
            'shortcode': shortcode,
            'username_id': username_id,
            'caption_path': caption_path,
            'posted_at': post_date.isoformat() if post_date else datetime.now(timezone.utc).isoformat(),
            'processed': False
        }
        
        result = supabase.table('posts').insert(new_post).execute()
        return result.data[0] if result.data else None
        
    except Exception as e:
        print(f"❌ Error creating post record: {e}")
        return None

async def create_image_record(post_id, file_path):
    """Create image record in post_images table"""
    try:
        new_image = {
            'post_id': post_id,
            'file_path': file_path
        }
        
        result = supabase.table('post_images').insert(new_image).execute()
        return result.data[0] if result.data else None
        
    except Exception as e:
        print(f"❌ Error creating image record: {e}")
        return None

async def upload_to_supabase(data, filepath, bucket_name, content_type="image/jpeg"):
    """Upload data to Supabase storage bucket"""
    try:
        if isinstance(data, str):
            # For text data (captions)
            data = data.encode('utf-8')
            content_type = "text/plain"
        
        result = supabase.storage.from_(bucket_name).upload(
            filepath, 
            data,
            file_options={"content-type": content_type}
        )
        print(f"✅ Uploaded {filepath} to {bucket_name}")
        return result
    except Exception as e:
        print(f"❌ Failed to upload {filepath}: {e}")
        return None

async def scrape_profile(profile, context):
    """Scrape a single profile"""
    username = profile['username']
    username_id = profile['id']
    last_seen_shortcode = profile.get('last_seen_shortcode')
    
    print(f"\n🔍 Processing profile: {username}")
    print(f"   Last seen shortcode: {last_seen_shortcode or 'None'}")
    
    try:
        page = await context.new_page()
        await page.goto(f"https://www.instagram.com/{username}/", timeout=60000)

        # Check and save profile picture to Supabase if it doesn't exist
        print(f"Checking profile picture for {username}...")
        try:
            profile_pic_path = f"{username}/{username}_profile.jpg"
            
            # Check if profile picture already exists
            if await file_exists_in_storage(profile_pic_path, "instagram-profile-pics"):
                print(f"⏭️  Profile picture already exists for {username}, skipping download")
            else:
                pic_url = await page.locator("header img").first.get_attribute("src")
                if pic_url:
                    image_response = await context.request.get(pic_url)
                    profile_data = await image_response.body()
                    await upload_to_supabase(profile_data, profile_pic_path, "instagram-profile-pics")
                    print(f"✅ Profile picture uploaded for {username}")
                else:
                    print(f"❌ Could not find profile picture URL for {username}")
                    
        except Exception as e:
            print(f"❌ Error handling profile picture for {username}: {e}")

        # Check and save bio to Supabase if it doesn't exist
        print(f"Checking bio for {username}...")
        try:
            bio_path = f"{username}/{username}_bio.txt"
            
            # Check if bio already exists
            if await file_exists_in_storage(bio_path, "instagram-bios"):
                print(f"⏭️  Bio already exists for {username}, skipping download")
            else:
                # First, check for and click "more" button if it exists
                try:
                    more_button = page.locator('span.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.x1ji0vk5.x18bv5gf.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.xo1l8bm.x1roi4f4.x1yc453h.x10wh9bi.xpm28yp.x8viiok.x1o7cslx:has-text("more")')
                    if await more_button.count() > 0:
                        await more_button.click()
                        await page.wait_for_timeout(1000)
                        print(f"Clicked 'more' button for {username}")
                except Exception:
                    pass
                
                # Extract bio text using specific selector
                bio_text = None
                try:
                    bio_span = page.locator('span._ap3a._aaco._aacu._aacx._aad7._aade')
                    if await bio_span.count() > 0:
                        bio_text = await bio_span.first.inner_text()
                        if bio_text:
                            bio_text = bio_text.strip()
                except Exception:
                    pass
                
                # Extract link if it exists
                link_text = None
                try:
                    link_div = page.locator('div._ap3a._aaco._aacw._aacz._aada._aade')
                    if await link_div.count() > 0:
                        link_text = await link_div.first.inner_text()
                        if link_text:
                            link_text = link_text.strip()
                            # Combine bio and link
                            if bio_text and link_text:
                                bio_text = f"{bio_text}\n\nLink: {link_text}"
                            elif link_text and not bio_text:
                                bio_text = f"Link: {link_text}"
                except Exception:
                    pass
                
                if bio_text:
                    # Upload bio to storage
                    await upload_to_supabase(bio_text, bio_path, "instagram-bios", "text/plain")
                    
                    # Update profiles table with bio_file_path
                    try:
                        result = supabase.table('profiles').update({
                            'bio_file_path': bio_path,
                            'last_updated': datetime.now(timezone.utc).isoformat()
                        }).eq('id', username_id).execute()
                        
                        if result.data:
                            print(f"✅ Bio uploaded and profile updated for {username}")
                        else:
                            print(f"✅ Bio uploaded for {username}")
                            
                    except Exception as e:
                        print(f"✅ Bio uploaded for {username}, but failed to update profile: {e}")
                        
                else:
                    print(f"❌ Could not find bio text for {username}")
                    
        except Exception as e:
            print(f"❌ Error handling bio for {username}: {e}")

        # Wait for posts grid to load with polling
        print(f"Waiting for posts grid to load for {username}...")
        post_count = 0
        max_attempts = 15
        
        for attempt in range(max_attempts):
            post_count = await page.locator('a[href*="/p/"]').count()
            if post_count > 0:
                print(f"Found {post_count} posts for {username}!")
                break
            await page.wait_for_timeout(1000)
        
        if post_count == 0:
            print(f"No posts found for {username}")
            await page.close()
            return
        
        # Extract all post URLs first
        post_urls = []
        for i in range(min(20, post_count)):  # Process up to 20 posts
            post_url = await page.locator('a[href*="/p/"]').nth(i).get_attribute("href")
            if post_url:
                post_urls.append(post_url)
        
        print(f"Extracted {len(post_urls)} post URLs for {username}")
        
        # Process each post
        new_posts_processed = 0
        skip_reason = None
        latest_shortcode = None
        
        for i, post_url in enumerate(post_urls):
            shortcode = extract_shortcode_from_url(post_url)
            if not shortcode:
                print(f"❌ Could not extract shortcode from {post_url}")
                continue
            
            # Track the most recent shortcode (first post)
            if i == 0:
                latest_shortcode = shortcode
            
            print(f"\n--- Processing Post {i+1}/{len(post_urls)}: {shortcode} ---")
            
            # Check if we should stop based on last seen shortcode
            if await should_stop_scraping(shortcode, last_seen_shortcode):
                print(f"⏹️  Reached last seen shortcode {shortcode}, stopping profile...")
                skip_reason = "reached_last_seen"
                break
            
            # Check if post already exists - if so, skip entire profile since posts are chronological
            if await check_post_exists(shortcode):
                print(f"⏭️  Post {shortcode} already exists, skipping entire profile (posts are chronological)...")
                skip_reason = "duplicate_found"
                break
            
            # Click the post
            await page.locator('a[href*="/p/"]').nth(i).click()
            await page.wait_for_timeout(2000)
            
            # Find dialog or article
            dialog_visible = await page.locator('div[role="dialog"]').count()
            dialog = page.locator('div[role="dialog"]').first if dialog_visible > 0 else page.locator('article').first
            
            # Extract post date
            post_date = await extract_post_date(dialog)
            
            # Check if post is recent enough (1 month or newer) - if not, skip entire profile
            if not is_post_recent_enough(post_date, months_threshold=1):
                if post_date:
                    print(f"⏭️  Post {shortcode} is too old ({post_date.strftime('%Y-%m-%d')}), skipping entire profile (posts are chronological)...")
                else:
                    print(f"⏭️  Post {shortcode} has no date, skipping entire profile...")
                skip_reason = "too_old"
                
                # Close modal before breaking
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(1000)
                break
            
            # Extract and save caption
            caption_path = None
            try:
                caption_text = await dialog.locator("h1").first.inner_text()
                if caption_text:
                    caption_path = f"{username}/{shortcode}.txt"
                    await upload_to_supabase(caption_text, caption_path, "instagram-captions", "text/plain")
                    print(f"Caption uploaded for {shortcode}")
            except Exception as e:
                print(f"No caption for {shortcode}")

            # Create post record in database with actual post date
            post_record = await create_post_record(shortcode, username_id, post_date, caption_path)
            if not post_record:
                print(f"❌ Could not create post record for {shortcode}")
                continue
            
            post_id = post_record['id']

            # Navigate carousel and collect images
            image_urls = set()
            carousel_position = 0
            max_carousel_attempts = 20
            
            while carousel_position < max_carousel_attempts:
                # Collect images from current position
                current_images_added = 0
                
                # Primary method: Look for post content images
                post_images = dialog.locator('img[alt*="Photo by"], img[alt*="May be"], img[alt*="Image"]')
                img_count = await post_images.count()
                
                for j in range(img_count):
                    try:
                        img_src = await post_images.nth(j).get_attribute("src")
                        if img_src and "cdninstagram.com" in img_src:
                            # Skip small profile pictures
                            if any(size in img_src for size in ["_s150x150", "_s320x320", "_s640x640"]):
                                continue
                            if img_src not in image_urls:
                                image_urls.add(img_src)
                                current_images_added += 1
                    except Exception:
                        continue
                
                # Fallback: If no images found with alt text filter
                if current_images_added == 0 and len(image_urls) == 0:
                    all_images = dialog.locator('img[src*="cdninstagram.com"]')
                    all_count = await all_images.count()
                    
                    for j in range(all_count):
                        try:
                            img_element = all_images.nth(j)
                            img_src = await img_element.get_attribute("src")
                            alt_text = await img_element.get_attribute("alt") or ""
                            
                            # Skip profile pictures and small images
                            if any(skip_term in alt_text.lower() for skip_term in ["profile picture", "'s profile", "avatar"]):
                                continue
                            if any(size in img_src for size in ["_s150x150", "_s320x320"]):
                                continue
                            
                            # Skip very small images
                            try:
                                width = await img_element.get_attribute("width")
                                height = await img_element.get_attribute("height")
                                if width and height and int(width) <= 150 and int(height) <= 150:
                                    continue
                            except:
                                pass
                            
                            if img_src not in image_urls:
                                image_urls.add(img_src)
                                current_images_added += 1
                                
                        except Exception:
                            continue
                
                # Try to navigate to next image
                next_clicked = False
                next_selectors = [
                    'button[aria-label="Next"]',
                    'svg[aria-label="Next"]',
                    'div[role="button"] svg[aria-label="Next"]',
                ]
                
                for next_selector in next_selectors:
                    try:
                        next_btn = dialog.locator(next_selector).first
                        if await next_btn.count() > 0 and await next_btn.is_visible():
                            # If it's an SVG, click its parent button
                            if next_selector.startswith('svg'):
                                parent_btn = next_btn.locator('xpath=ancestor::button[1] | xpath=ancestor::div[@role="button"][1]').first
                                if await parent_btn.count() > 0:
                                    await parent_btn.click()
                                else:
                                    await next_btn.click()
                            else:
                                await next_btn.click()
                            
                            await page.wait_for_timeout(1500)
                            next_clicked = True
                            break
                            
                    except Exception:
                        continue
                
                if not next_clicked:
                    break
                
                carousel_position += 1
            
            # Upload images to Supabase and create database records
            for j, url in enumerate(list(image_urls), 1):
                try:
                    response = await context.request.get(url)
                    image_data = await response.body()
                    
                    # Use shortcode in filename
                    image_filename = f"{username}/{shortcode}_{j}.jpg"
                    await upload_to_supabase(image_data, image_filename, "instagram-posts")
                    
                    # Create image record in database
                    await create_image_record(post_id, image_filename)
                    
                except Exception as e:
                    print(f"Failed to upload image {j} for {shortcode}: {e}")
            
            print(f"Post {shortcode} completed: {len(image_urls)} images uploaded")
            new_posts_processed += 1

            # Close modal and return to grid
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(1000)
        
        # Update last seen shortcode if we processed any posts
        if latest_shortcode and new_posts_processed > 0:
            await update_profile_last_seen(username_id, latest_shortcode)
        
        # Provide summary with skip reason
        if skip_reason:
            skip_messages = {
                "reached_last_seen": "reached last seen post",
                "duplicate_found": "found duplicate post",
                "too_old": "posts are too old"
            }
            print(f"✅ Completed {username}: {new_posts_processed} new posts processed, stopped because {skip_messages[skip_reason]}")
        else:
            print(f"✅ Completed {username}: {new_posts_processed} new posts processed")
            
        await page.close()
        
    except Exception as e:
        print(f"❌ Error processing profile {username}: {e}")
        try:
            await page.close()
        except:
            pass

async def main():
    # Get all profiles from database
    profiles = await get_all_profiles()
    if not profiles:
        print("No profiles found in database")
        return
    
    async with async_playwright() as p:
        ctx = await p.chromium.launch(headless=True)
        context = await ctx.new_context(storage_state=STATE)
        
        print(f"🚀 Starting to process {len(profiles)} profiles...")
        print(f"📅 Only processing posts from the last 1 month...")
        print(f"⚡ Optimized: skipping profiles when old/duplicate posts found...")
        
        # Process each profile
        for i, profile in enumerate(profiles, 1):
            print(f"\n{'='*50}")
            print(f"Processing profile {i}/{len(profiles)}: {profile['username']}")
            print(f"{'='*50}")
            
            await scrape_profile(profile, context)
            
            # Small delay between profiles
            await asyncio.sleep(2)
        
        print(f"\n🎉 Script completed! Processed {len(profiles)} profiles.")

if __name__ == "__main__":
    asyncio.run(main())
