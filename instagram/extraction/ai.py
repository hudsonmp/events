#!/usr/bin/env python3
"""
AI Event Extraction using Groq API
Fetches Instagram post data from Supabase and extracts event information using Groq's vision and text models.
"""

import os
import json
import sys
import base64
import time
import threading
from collections import deque
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from supabase import create_client, Client
from groq import Groq
from dotenv import load_dotenv
import string
from datetime import datetime, timezone, timedelta
from dateutil import parser as date_parser
import psycopg2

# Load environment variables
load_dotenv()

class GroqRateLimiter:
    """
    Rate limiter for Groq API calls with RPM, RPD, and TPM tracking.
    Enforces 90% safety thresholds and handles 429 responses.
    """
    
    def __init__(self):
        # Official Groq limits (as of current knowledge)
        self.OFFICIAL_RPM_LIMIT = 1000
        self.OFFICIAL_RPD_LIMIT = 500000
        self.OFFICIAL_TPM_LIMIT = 300000
        
        # Safety thresholds at 90% of official limits
        self.RPM_THRESHOLD = int(self.OFFICIAL_RPM_LIMIT * 0.9)  # 900
        self.RPD_THRESHOLD = int(self.OFFICIAL_RPD_LIMIT * 0.9)  # 450,000
        self.TPM_THRESHOLD = int(self.OFFICIAL_TPM_LIMIT * 0.9)  # 270,000
        
        # Tracking data structures
        self.requests_per_minute = deque()  # (timestamp, tokens_used)
        self.requests_per_day = deque()     # (timestamp, tokens_used)
        self.tokens_per_minute = deque()    # (timestamp, tokens_used)
        
        # Thread safety
        self.lock = threading.Lock()
        
        print(f"🛡️ Groq Rate Limiter initialized:")
        print(f"   RPM threshold: {self.RPM_THRESHOLD}")
        print(f"   RPD threshold: {self.RPD_THRESHOLD}")
        print(f"   TPM threshold: {self.TPM_THRESHOLD}")
    
    def _cleanup_old_entries(self, current_time: float):
        """Remove entries older than their respective time windows."""
        minute_ago = current_time - 60
        day_ago = current_time - (24 * 60 * 60)
        
        # Clean up requests_per_minute (1 minute window)
        while self.requests_per_minute and self.requests_per_minute[0][0] < minute_ago:
            self.requests_per_minute.popleft()
        
        # Clean up requests_per_day (24 hour window)
        while self.requests_per_day and self.requests_per_day[0][0] < day_ago:
            self.requests_per_day.popleft()
            
        # Clean up tokens_per_minute (1 minute window)
        while self.tokens_per_minute and self.tokens_per_minute[0][0] < minute_ago:
            self.tokens_per_minute.popleft()
    
    def _get_current_usage(self, current_time: float) -> Tuple[int, int, int]:
        """Get current RPM, RPD, and TPM usage."""
        self._cleanup_old_entries(current_time)
        
        rpm = len(self.requests_per_minute)
        rpd = len(self.requests_per_day)
        tpm = sum(entry[1] for entry in self.tokens_per_minute)
        
        return rpm, rpd, tpm
    
    def _estimate_tokens(self, messages: List[Dict], model: str) -> int:
        """Estimate token usage for a request."""
        # Rough estimation: 4 characters per token for text
        total_chars = 0
        
        for message in messages:
            if isinstance(message.get('content'), str):
                total_chars += len(message['content'])
            elif isinstance(message.get('content'), list):
                for content_item in message['content']:
                    if content_item.get('type') == 'text':
                        total_chars += len(content_item.get('text', ''))
                    elif content_item.get('type') == 'image_url':
                        # Images consume more tokens - rough estimate
                        total_chars += 1000  # Approximate token cost per image
        
        estimated_tokens = total_chars // 4
        
        # Add buffer for response tokens (rough estimate)
        estimated_response_tokens = 1000  # Conservative estimate
        
        return estimated_tokens + estimated_response_tokens
    
    def check_and_wait_if_needed(self, messages: List[Dict], model: str) -> bool:
        """
        Check if request can proceed without hitting rate limits.
        If limits would be exceeded, wait until it's safe to proceed.
        Returns True if request can proceed, False if should be skipped.
        """
        estimated_tokens = self._estimate_tokens(messages, model)
        
        with self.lock:
            current_time = time.time()
            rpm, rpd, tpm = self._get_current_usage(current_time)
            
            print(f"📊 Current usage: RPM={rpm}/{self.RPM_THRESHOLD}, RPD={rpd}/{self.RPD_THRESHOLD}, TPM={tpm}/{self.TPM_THRESHOLD}")
            print(f"🔢 Estimated tokens for this request: {estimated_tokens}")
            
            # Check if any limits would be exceeded
            would_exceed_rpm = rpm >= self.RPM_THRESHOLD
            would_exceed_rpd = rpd >= self.RPD_THRESHOLD
            would_exceed_tpm = (tpm + estimated_tokens) >= self.TPM_THRESHOLD
            
            if would_exceed_rpm or would_exceed_rpd or would_exceed_tpm:
                exceeded_limits = []
                if would_exceed_rpm:
                    exceeded_limits.append(f"RPM ({rpm}/{self.RPM_THRESHOLD})")
                if would_exceed_rpd:
                    exceeded_limits.append(f"RPD ({rpd}/{self.RPD_THRESHOLD})")
                if would_exceed_tpm:
                    exceeded_limits.append(f"TPM ({tpm + estimated_tokens}/{self.TPM_THRESHOLD})")
                
                print(f"🚫 Rate limits would be exceeded: {', '.join(exceeded_limits)}")
                
                # Calculate wait time based on oldest entry that needs to expire
                wait_times = []
                
                if would_exceed_rpm and self.requests_per_minute:
                    oldest_minute_entry = self.requests_per_minute[0][0]
                    wait_until_minute = oldest_minute_entry + 60
                    wait_times.append(wait_until_minute - current_time)
                
                if would_exceed_tpm and self.tokens_per_minute:
                    # Find when enough tokens will expire from the minute window
                    tokens_to_free = (tpm + estimated_tokens) - self.TPM_THRESHOLD + 1
                    running_tokens = 0
                    for entry_time, entry_tokens in self.tokens_per_minute:
                        running_tokens += entry_tokens
                        if running_tokens >= tokens_to_free:
                            wait_until_tpm = entry_time + 60
                            wait_times.append(wait_until_tpm - current_time)
                            break
                
                if would_exceed_rpd:
                    # For daily limits, we might need to wait up to 24 hours
                    print("⚠️ Daily request limit reached. Consider reducing batch size or waiting until tomorrow.")
                    return False
                
                if wait_times:
                    max_wait = max(wait_times)
                    if max_wait > 0:
                        print(f"⏳ Waiting {max_wait:.1f} seconds to respect rate limits...")
                        time.sleep(max_wait + 1)  # Add 1 second buffer
                        return self.check_and_wait_if_needed(messages, model)  # Recheck after waiting
            
            # Record the request
            self.requests_per_minute.append((current_time, estimated_tokens))
            self.requests_per_day.append((current_time, estimated_tokens))
            self.tokens_per_minute.append((current_time, estimated_tokens))
            
            return True
    
    def handle_429_response(self, response_headers: Dict[str, str]):
        """Handle 429 response by parsing Retry-After header and waiting."""
        retry_after = response_headers.get('retry-after') or response_headers.get('Retry-After')
        
        if retry_after:
            try:
                wait_seconds = int(retry_after)
                print(f"🚫 Received 429 response. Waiting {wait_seconds} seconds as specified in Retry-After header...")
                time.sleep(wait_seconds)
            except ValueError:
                # Retry-After might be in HTTP date format
                print(f"🚫 Received 429 response. Waiting 60 seconds (could not parse Retry-After: {retry_after})...")
                time.sleep(60)
        else:
            print("🚫 Received 429 response. Waiting 60 seconds (no Retry-After header found)...")
            time.sleep(60)
    
    def update_actual_usage(self, actual_tokens_used: int):
        """Update usage tracking with actual token consumption from response."""
        with self.lock:
            current_time = time.time()
            
            # Remove the estimated entry and add actual usage
            if self.requests_per_minute:
                estimated_time, estimated_tokens = self.requests_per_minute[-1]
                if abs(estimated_time - current_time) < 5:  # Within 5 seconds
                    self.requests_per_minute[-1] = (estimated_time, actual_tokens_used)
            
            if self.requests_per_day:
                estimated_time, estimated_tokens = self.requests_per_day[-1]
                if abs(estimated_time - current_time) < 5:  # Within 5 seconds
                    self.requests_per_day[-1] = (estimated_time, actual_tokens_used)
                    
            if self.tokens_per_minute:
                estimated_time, estimated_tokens = self.tokens_per_minute[-1]
                if abs(estimated_time - current_time) < 5:  # Within 5 seconds
                    self.tokens_per_minute[-1] = (estimated_time, actual_tokens_used)
    
    def update_limits(self, rpm_limit: int = None, rpd_limit: int = None, tpm_limit: int = None):
        """
        Update the official API limits and recalculate 90% safety thresholds.
        Use this method when Groq updates their API limits.
        """
        with self.lock:
            if rpm_limit is not None:
                self.OFFICIAL_RPM_LIMIT = rpm_limit
                self.RPM_THRESHOLD = int(rpm_limit * 0.9)
                print(f"🔄 Updated RPM limit: {rpm_limit} (threshold: {self.RPM_THRESHOLD})")
            
            if rpd_limit is not None:
                self.OFFICIAL_RPD_LIMIT = rpd_limit
                self.RPD_THRESHOLD = int(rpd_limit * 0.9)
                print(f"🔄 Updated RPD limit: {rpd_limit} (threshold: {self.RPD_THRESHOLD})")
            
            if tpm_limit is not None:
                self.OFFICIAL_TPM_LIMIT = tpm_limit
                self.TPM_THRESHOLD = int(tpm_limit * 0.9)
                print(f"🔄 Updated TPM limit: {tpm_limit} (threshold: {self.TPM_THRESHOLD})")
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics."""
        with self.lock:
            current_time = time.time()
            rpm, rpd, tpm = self._get_current_usage(current_time)
            
            return {
                'requests_per_minute': {
                    'current': rpm,
                    'limit': self.OFFICIAL_RPM_LIMIT,
                    'threshold': self.RPM_THRESHOLD,
                    'percentage': round((rpm / self.RPM_THRESHOLD) * 100, 1) if self.RPM_THRESHOLD > 0 else 0
                },
                'requests_per_day': {
                    'current': rpd,
                    'limit': self.OFFICIAL_RPD_LIMIT,
                    'threshold': self.RPD_THRESHOLD,
                    'percentage': round((rpd / self.RPD_THRESHOLD) * 100, 1) if self.RPD_THRESHOLD > 0 else 0
                },
                'tokens_per_minute': {
                    'current': tpm,
                    'limit': self.OFFICIAL_TPM_LIMIT,
                    'threshold': self.TPM_THRESHOLD,
                    'percentage': round((tpm / self.TPM_THRESHOLD) * 100, 1) if self.TPM_THRESHOLD > 0 else 0
                }
            }
    
    def reset_usage(self):
        """Reset all usage tracking. Use with caution - for testing or manual resets only."""
        with self.lock:
            self.requests_per_minute.clear()
            self.requests_per_day.clear()
            self.tokens_per_minute.clear()
            print("🔄 Rate limiter usage statistics reset")


class EventExtractor:
    def __init__(self):
        """Initialize the event extractor with Supabase and Groq clients."""
        self.supabase_url = os.getenv("SUPABASE_PROJECT_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        
        if not all([self.supabase_url, self.supabase_key, self.groq_api_key]):
            raise ValueError("Missing required environment variables: SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE, GROQ_API_KEY")
        
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.groq = Groq(api_key=self.groq_api_key)
        
        # Initialize rate limiter
        self.rate_limiter = GroqRateLimiter()
        
        # Load the JSON schema for structured output
        schema_path = Path(__file__).parent / "groq_output_schema.json"
        with open(schema_path, 'r') as f:
            self.output_schema = json.load(f)
    
    def fetch_unprocessed_posts(self, limit: int = None) -> List[Dict[str, Any]]:
        """Fetch unprocessed posts with their associated profile and image data."""
        try:
            # Fetch posts that haven't been processed yet
            query = self.supabase.table('posts').select(
                '''
                *,
                profiles:username_id (
                    username,
                    bio,
                    bio_file_path,
                    id,
                    school_id
                ),
                post_images (
                    file_path
                )
                '''
            ).eq('processed', False)
            
            # Only apply limit if specified
            if limit:
                query = query.limit(limit)
                
            posts_response = query.execute()
            posts_data = posts_response.data if posts_response.data else []
            
            # Filter out posts older than 1 month and mark them as processed
            current_time = datetime.now(timezone.utc)
            one_month_ago = current_time - timedelta(days=30)
            
            valid_posts = []
            old_post_ids = []
            
            for post in posts_data:
                try:
                    # Parse the created_at timestamp
                    created_at = date_parser.parse(post.get('created_at', ''))
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    
                    if created_at < one_month_ago:
                        print(f"⏰ Post from @{post.get('profiles', {}).get('username', 'unknown')} is older than 1 month ({created_at.strftime('%Y-%m-%d')}) - marking as processed")
                        old_post_ids.append(post['id'])
                    else:
                        valid_posts.append(post)
                except Exception as date_error:
                    print(f"⚠️ Could not parse date for post {post.get('id')}: {date_error} - including in processing")
                    valid_posts.append(post)
            
            # Mark old posts as processed in batch
            if old_post_ids:
                try:
                    for post_id in old_post_ids:
                        self.supabase.table('posts').update({'processed': True}).eq('id', post_id).execute()
                    print(f"✅ Marked {len(old_post_ids)} old posts as processed")
                except Exception as e:
                    print(f"⚠️ Error marking old posts as processed: {e}")
            
            return valid_posts
            
        except Exception as e:
            print(f"Error fetching posts: {e}")
            return []
    
    def read_file_content(self, file_path: str, bucket_name: str) -> Optional[str]:
        """Read content from a Supabase Storage file path."""
        try:
            if file_path:
                # Download file content from Supabase Storage
                response = self.supabase.storage.from_(bucket_name).download(file_path)
                if response:
                    # Decode bytes to string for text files
                    content = response.decode('utf-8')
                    return content
        except Exception as e:
            print(f"Error reading file {file_path} from storage: {e}")
        return None
    
    def prepare_groq_request(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare the request data for Groq API."""
        profile = post_data.get('profiles', {})
        post_images = post_data.get('post_images', [])
        
        # Parse posted date for context
        posted_at = None
        posted_at_str = "Unknown"
        try:
            if post_data.get('created_at'):
                posted_at = date_parser.parse(post_data['created_at'])
                if posted_at.tzinfo is None:
                    posted_at = posted_at.replace(tzinfo=timezone.utc)
                posted_at_str = posted_at.strftime('%A, %B %d, %Y at %I:%M %p UTC')
        except Exception as e:
            print(f"⚠️ Could not parse posted date: {e}")
        
        # Read caption content if available
        caption_content = None
        if post_data.get('caption_path'):
            caption_content = self.read_file_content(post_data['caption_path'], "instagram-captions")
        
        # Read bio content if available
        bio_content = profile.get('bio', '')
        if profile.get('bio_file_path'):
            file_bio = self.read_file_content(profile['bio_file_path'], "instagram-bios")
            if file_bio:
                bio_content = file_bio
        
        # Prepare text content for Groq with posting context
        text_content = f"""
        Instagram Profile: @{profile.get('username', 'unknown')}
        
        Bio: {bio_content or 'No bio available'}
        
        Post Caption: {caption_content or 'No caption available'}
        
        **POSTING CONTEXT:**
        This post was published on: {posted_at_str}
        """
        
        # Prepare image attachments (limit to 3 as per Groq's vision limit)
        image_contents = []
        for i, img in enumerate(post_images[:3]):  # Max 3 images
            if img.get('file_path'):
                try:
                    # Download image data from Supabase Storage
                    image_data = self.supabase.storage.from_("instagram-posts").download(img['file_path'])
                    if image_data:
                        # Encode image as base64 for Groq
                        base64_image = base64.b64encode(image_data).decode('utf-8')
                        image_contents.append({
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        })
                except Exception as e:
                    print(f"Error reading image {img['file_path']}: {e}")
        
        return {
            'text_content': text_content,
            'image_contents': image_contents,
            'post_id': post_data.get('id'),
            'username': profile.get('username'),
            'profile_id': profile.get('id'),
            'school_id': profile.get('school_id'),
            'posted_at': posted_at,
            'posted_at_str': posted_at_str
        }
    
    def extract_events_with_groq(self, request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Send data to Groq and get structured event extraction with rate limiting."""
        try:
            # Get current date information for the prompt
            current_datetime = datetime.now()
            current_date_str = current_datetime.strftime('%Y-%m-%d')
            current_year = current_datetime.year
            
            system_prompt = f"""
You are an **Event Intelligence Agent** extracting school events from Instagram posts.

**CURRENT DATE/TIME**: {current_date_str} ({current_datetime.strftime('%A')})
**CURRENT YEAR**: {current_year}

**CRITICAL: ANNOUNCEMENT vs NEWS DETECTION - APPLY FIRST**:
ONLY extract events from posts that are **ANNOUNCEMENTS** of future activities, NOT news sharing or status updates.

**✅ EXTRACT from posts that:**
- Announce upcoming events with clear calls-to-action: "Join us Friday for...", "Don't miss our dance next week", "Tryouts will be held..."
- Contain invitation language: "Come to...", "Sign up for...", "Register by...", "Applications due..."
- Use future-oriented language: "will be", "is coming", "save the date", "mark your calendars"
- Include specific future dates/times with actionable context
- Share ongoing information with specific future dates: "We meet every Tuesday"

**❌ DO NOT EXTRACT from posts that:**
- Share updates about past events: "We had an amazing game yesterday", "Thanks to everyone who came", "Great turnout at last night's..."
- Make general statements without dates: "We are the chess club", "Our team practices hard", "Drama club is awesome"
- Share achievements or results: "We won the championship", "Congratulations to our players", "Great job team"
- Post photos/memories from past events without future context
- Share ongoing information without specific future dates: "We are going to Big Bear to train" (unless announcing next specific meeting)

**CRITICAL TEMPORAL CONTEXT**: 
- The post you're analyzing has a specific publication date/time provided in the content
- Resolve ALL relative dates ("this Friday", "next week", "tomorrow") against the POST DATE, not current date
- Then validate if those resolved dates are still upcoming compared to TODAY ({current_date_str})
- If a post says "this Friday" and was posted 2 weeks ago, that Friday has already passed - SKIP IT

## 1. DATE RESOLUTION & VALIDATION - STRICTLY ENFORCE:

**Step 1: Resolve relative dates against POST DATE**
- "this Friday" = the Friday of the week the post was published
- "next Friday" = the Friday after the post publication week  
- "tomorrow" = the day after the post was published
- "at lunch today" = lunchtime (~12:00 PM) on the day the post was published

**Step 2: Validate against CURRENT DATE**
- ONLY include events that occur on or after {current_date_str}
- If post date context shows an event has passed, SKIP IT entirely
- If you can't determine the exact date, err on the side of caution and SKIP

**Step 3: Future date limits**
- REJECT events more than 120 days in the future UNLESS a specific year is mentioned
- If someone posts "March 15th" in December, it likely means next year - but without year specified, assume this year and reject if >120 days

**Step 4: Time defaults**
- If date is clear but time is vague: "at lunch" = 12:00 PM, "after school" = 4:00 PM
- If only date given (no time), set as all-day event
- Avoid defaulting to midnight - use contextual times or all-day

## 2. CATEGORY CLASSIFICATION - MAX 2 PER EVENT:

**SPORT**: Athletic competitions, tryouts, practices, games
- Examples: "Basketball tryouts", "Soccer game vs. rivals", "Track meet", "Tennis practice"
- NOT for: athletic club meetings (use "club")

**CLUB**: Organization meetings, club activities, student groups  
- Examples: "Drama club auditions", "Robotics team meeting", "Student government", "Chess club tournament"
- Includes: tryouts for clubs (not sports), club fundraisers

**EVENT**: General school events, social gatherings, performances
- Examples: "Homecoming dance", "Talent show", "School assembly", "Graduation ceremony"
- NOT for: specific academic or athletic activities

**DEADLINE**: Time-sensitive requirements, applications, submissions
- Examples: "FAFSA due Monday", "College app deadline", "Permission slip return date", "Yearbook photo submissions"
- ONLY for actual deadlines, not event reminders

**MEETING**: Formal meetings, parent conferences, academic sessions
- Examples: "Parent-teacher conferences", "College counseling session", "Honor society meeting"
- NOT for: club meetings (use "club"), sports meetings (use "sport")

## 3. AUDIENCE TARGETING & SPLITTING:
- Create separate events for different audiences/times
- Include specific level in title: "JV Basketball Tryouts", "Senior Graduation Pictures"  
- Split multi-level events: "JV and Varsity tryouts" = 2 separate events

## 4. ENHANCED TAGGING - TARGET ~30 TAGS:
- Use single words only: "Basketball" not "Basketball Team"
- Include variations: "Soccer", "Football" for soccer posts
- Cover multiple search angles: sport name, level, gender, general terms
- Examples: "Basketball", "Tryouts", "JV", "Girls", "Athletics", "Sports", "Team", "Competition", "School", "Students"

## 5. WRITING STANDARDS:
- **Title**: ≤8 words, include audience level, optional emoji
- **Description**: 3-4 sentences with specific details, context, practical info
- **Categories**: Exactly 1-2 categories, be specific about distinctions
- **Tags**: ~30 single-word tags covering all search angles

## 6. QUALITY CHECKLIST:
✅ Resolved relative dates against POST date, then validated against current date
✅ No events in the past (before {current_date_str})
✅ No events >120 days future without specified year
✅ Contextual times used ("lunch"=12PM, "after school"=4PM)
✅ 1-2 specific categories chosen correctly
✅ Audience level in title when applicable
✅ ~30 relevant single-word tags
✅ All-day events when time is ambiguous

**OUTPUT**: JSON object only, no commentary.
            """
            
            # Prepare messages - start with text content and images in one message
            user_content = [{"type": "text", "text": request_data['text_content']}]
            
            # Add images to the same message
            if request_data['image_contents']:
                user_content.extend(request_data['image_contents'])
                
            messages = [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user", 
                    "content": user_content
                }
            ]
            
            model = "meta-llama/llama-4-scout-17b-16e-instruct"  # User's preferred model
            
            # Check rate limits and wait if necessary
            if not self.rate_limiter.check_and_wait_if_needed(messages, model):
                print("🚫 Request skipped due to rate limits (daily limit reached)")
                return None
            
            # Make request to Groq with retry logic for 429 responses
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    print(f"🤖 Making Groq API request (attempt {attempt + 1}/{max_retries})...")
                    
                    response = self.groq.chat.completions.create(
                        model=model,
                        messages=messages,
                        response_format={
                            "type": "json_schema",
                            "json_schema": {
                                "name": "event_extraction",
                                "schema": self.output_schema
                            }
                        },
                        temperature=0.4,  # Slightly higher temperature for better reasoning
                        max_tokens=4000
                    )
                    
                    # Update actual token usage if available
                    if hasattr(response, 'usage') and response.usage:
                        actual_tokens = response.usage.total_tokens
                        print(f"📊 Actual tokens used: {actual_tokens}")
                        self.rate_limiter.update_actual_usage(actual_tokens)
                    
                    # Parse the structured response
                    raw_content = response.choices[0].message.content
                    extracted_data = json.loads(raw_content)
                    print("✅ Groq API request successful")
                    return extracted_data
                    
                except Exception as e:
                    # Check if it's a 429 (rate limit) error
                    if "429" in str(e) or "rate limit" in str(e).lower():
                        print(f"🚫 Rate limit error on attempt {attempt + 1}: {e}")
                        
                        # Try to extract headers from the exception if possible
                        headers = {}
                        if hasattr(e, 'response') and hasattr(e.response, 'headers'):
                            headers = dict(e.response.headers)
                        
                        # Handle 429 response
                        self.rate_limiter.handle_429_response(headers)
                        
                        if attempt < max_retries - 1:
                            print(f"🔄 Retrying request (attempt {attempt + 2}/{max_retries})...")
                            continue
                        else:
                            print(f"❌ Max retries reached for 429 errors")
                            return None
                    else:
                        # Non-429 error, don't retry
                        print(f"❌ Non-rate-limit error with Groq extraction: {e}")
                        return None
            
            return None
            
        except Exception as e:
            print(f"❌ Unexpected error with Groq extraction: {e}")
            return None
    
    # =====================
    # Validation & Insert
    # =====================
    CATEGORY_ENUM = ["event", "club", "sport", "deadline", "meeting"]
    TYPE_ENUM = ["in-person", "virtual", "hybrid"]
    
    def _to_utc(self, dt_str: str) -> Optional[str]:
        """Convert any datetime string to ISO-8601 UTC string."""
        if not dt_str:
            return None
        try:
            dt = date_parser.parse(dt_str)
            if not dt.tzinfo:
                dt = dt.replace(tzinfo=timezone.utc)
            dt_utc = dt.astimezone(timezone.utc)
            return dt_utc.isoformat()
        except Exception:
            return None
    
    def _normalize_tag(self, tag: str) -> str:
        tag = tag.strip().lstrip('#')
        # Remove punctuation but preserve spaces
        tag = tag.translate(str.maketrans('', '', string.punctuation))
        if tag.endswith('s') and not tag.endswith('ss') and len(tag) > 3:
            tag = tag[:-1]
        return tag.title()
    
    def _validate_event(self, raw_event: Dict[str, Any], top_level_categories: List[Dict] = None, top_level_tags: List[Dict] = None, posted_at: datetime = None) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Validate and normalize a single event dict. Returns (cleaned_dict, reason) where reason is 'past' if event is in the past, 'validation_failed' if validation failed, or None if successful."""
        start = self._to_utc(raw_event.get('start_datetime'))
        end = self._to_utc(raw_event.get('end_datetime'))
        
        # No automatic year updating - Groq should handle date validation
        
        # Ensure end after start if both exist
        if start and end and end < start:
            end = start
        
        # Skip events that have already happened (are in the past)
        if start:
            try:
                start_dt = date_parser.parse(start)
                current_time = datetime.now(timezone.utc)
                
                # For all-day events, check against the end of the day
                is_all_day = bool(raw_event.get('is_all_day'))
                if is_all_day:
                    # All-day events are valid if they're today or in the future
                    start_date = start_dt.date()
                    current_date = current_time.date()
                    if start_date < current_date:
                        print(f"    ⏰ All-day event '{raw_event.get('name', 'Unnamed')}' was on {start_date} - skipping")
                        return None, 'past'
                else:
                    # Timed events must be in the future
                    if start_dt < current_time:
                        print(f"    ⏰ Event '{raw_event.get('name', 'Unnamed')}' has already happened ({start_dt.strftime('%Y-%m-%d %H:%M')} UTC) - skipping")
                        return None, 'past'
            except Exception as e:
                print(f"    ⚠️ Error parsing start_datetime for past event check: {e}")
                # Continue processing if we can't parse the date
        
        # Check for events too far in the future (>120 days) unless year is specified
        if start:
            try:
                start_dt = date_parser.parse(start)
                current_time = datetime.now(timezone.utc)
                days_in_future = (start_dt - current_time).days
                
                # Check if year was explicitly mentioned in the original event text
                event_text = f"{raw_event.get('name', '')} {raw_event.get('description', '')}"
                has_explicit_year = any(str(year) in event_text for year in range(2024, 2030))
                
                if days_in_future > 120 and not has_explicit_year:
                    print(f"    📅 Event '{raw_event.get('name', 'Unnamed')}' is more than 120 days in future ({days_in_future} days) without explicit year - likely incorrect date, skipping")
                    return None, 'validation_failed'
            except Exception as e:
                print(f"    ⚠️ Error parsing start_datetime for future limit check: {e}")
        
        is_all_day = bool(raw_event.get('is_all_day'))
        event_type = (raw_event.get('type') or 'in-person').lower()
        if event_type not in self.TYPE_ENUM:
            event_type = 'in-person'
        # Helper function: empty string to None
        def empty_to_none(val):
            return None if (val is None or (isinstance(val, str) and val.strip() == "")) else val.strip()
        
        name = empty_to_none(raw_event.get('name', ''))
        description = empty_to_none(raw_event.get('description', ''))
        
        # Require at least a name or description
        if not name and not description:
            print(f"    ❌ Event has no name or description")
            return None, 'validation_failed'
            
        cleaned = {
            'name': name or 'Untitled Event',  # Provide default if only description exists
            'start_datetime': start,  # Can be None
            'end_datetime': end,      # Can be None
            'address': empty_to_none(raw_event.get('address')),
            'location_name': empty_to_none(raw_event.get('location_name')),
            'description': description,
            'is_all_day': is_all_day,
            'type': event_type,
            'url': empty_to_none(raw_event.get('url')),
        }
        # Categories & tags - use top-level ones from Groq response
        categories = []
        if top_level_categories:
            for c in top_level_categories:
                if isinstance(c, dict) and c.get('name'):
                    categories.append(c.get('name', '').lower())
                elif isinstance(c, str) and c.strip():
                    categories.append(c.strip().lower())
            categories = [c if c in self.CATEGORY_ENUM else 'event' for c in categories]
        
        tags = []
        if top_level_tags:
            for t in top_level_tags:
                if isinstance(t, dict) and t.get('tag'):
                    tags.append(self._normalize_tag(t.get('tag', '')))
                elif isinstance(t, str) and t.strip():
                    tags.append(self._normalize_tag(t.strip()))
        
        # Fallback: also check inside the event in case Groq put them there
        if not categories:
            for c in raw_event.get('categories', []):
                if isinstance(c, dict) and c.get('name'):
                    categories.append(c.get('name', '').lower())
                elif isinstance(c, str) and c.strip():
                    categories.append(c.strip().lower())
            categories = [c if c in self.CATEGORY_ENUM else 'event' for c in categories]
        
        if not tags:
            for t in raw_event.get('event_tags', []):
                if isinstance(t, dict) and t.get('tag'):
                    tags.append(self._normalize_tag(t.get('tag', '')))
                elif isinstance(t, str) and t.strip():
                    tags.append(self._normalize_tag(t.strip()))
        
        # DEDUPLICATE categories and tags to prevent constraint violations
        categories = list(dict.fromkeys(categories))  # Preserves order while removing duplicates
        tags = list(dict.fromkeys(tags))  # Preserves order while removing duplicates
        
        cleaned['categories'] = categories
        cleaned['tags'] = tags
        return cleaned, None
    
    def _get_or_create_category_ids(self, cat_names: List[str]) -> List[str]:
        ids = []
        for name in cat_names:
            # Try fetch existing category
            res = self.supabase.table('categories').select('id').eq('name', name).execute()
            if res.data:
                ids.append(res.data[0]['id'])
            else:
                # Create new category
                insert_res = self.supabase.table('categories').insert({'name': name}).execute()
                if insert_res.data:
                    ids.append(insert_res.data[0]['id'])
                else:
                    print(f"      ❌ Failed to create category '{name}'")
        return ids
    
    def _insert_transaction(self, event: Dict[str, Any], profile_id: str, school_id: str, post_id: str = None, caption_id: str = None) -> bool:
        """Insert event, categories, and tags using Supabase REST API."""
        try:
            # start_datetime can now be None - database allows it
            start_dt = event['start_datetime']  # Can be None
            
            event_data = {
                'url': event['url'],
                'name': event['name'],
                'start_datetime': start_dt,  # Can be None
                'end_datetime': event['end_datetime'],  # Can be None
                'school_id': school_id,
                'address': event['address'],
                'location_name': event['location_name'],
                'description': event['description'],
                'is_all_day': event['is_all_day'],
                'type': event['type'],
                'status': 'active',
                'profile_id': profile_id,
                'post_id': post_id,
                'caption_id': caption_id
            }
            
            insert_res = self.supabase.table('events').insert(event_data).execute()
            
            if not insert_res.data:
                print("Failed to insert event via REST - no data returned")
                return False
            event_id = insert_res.data[0]['id']
            # Categories
            cat_ids = self._get_or_create_category_ids(event['categories'])
            
            # Link categories and tags with simplified error handling
            for cid in cat_ids:
                try:
                    self.supabase.table('event_categories').insert({'event_id': event_id, 'category_id': cid}).execute()
                except Exception as e:
                    if "duplicate key" not in str(e):  # Only log non-duplicate errors
                        print(f"    ❌ Failed to link category {cid}: {e}")
                        raise
                
            # Tags
            for tag in event['tags']:
                try:
                    self.supabase.table('event_tags').insert({'event-id': event_id, 'tag': tag}).execute()
                except Exception as e:
                    if "duplicate key" not in str(e):  # Only log non-duplicate errors
                        print(f"    ❌ Failed to add tag '{tag}': {e}")
                        raise
                
            print(f"    🎉 Event insertion complete!")
            return True
        except Exception as e:
            print(f"    ❌ Event insertion failed: {e}")
            return False
    
    def validate_and_insert(self, extracted_data: Dict[str, Any], post_data: Dict[str, Any], posted_at: datetime = None) -> bool:
        """Validate Groq output and insert into DB. Returns True on success."""
        profile_id = post_data.get('profiles', {}).get('id')
        school_id = post_data.get('profiles', {}).get('school_id')
        post_id = post_data.get('id')
        caption_id = post_data.get('caption_path')  # Use caption_path as caption identifier
        events = extracted_data.get('events', [])
        
        # Get categories and tags from top level (Groq returns them here, not inside each event)
        top_level_categories = extracted_data.get('categories', [])
        top_level_tags = extracted_data.get('event_tags', [])
        print(f"🔍 Validating {len(events)} events...")
        
        success_any = False
        past_count = 0
        validation_failed_count = 0
        for i, raw_event in enumerate(events, 1):
            print(f"  Validating event {i}: {raw_event.get('name', 'Unnamed')}")
            cleaned, failure_reason = self._validate_event(raw_event, top_level_categories, top_level_tags, posted_at)
            if not cleaned:
                if failure_reason == 'past':
                    print(f"  ⏰ Event {i} is in the past – skipping.")
                    past_count += 1
                elif failure_reason == 'validation_failed':
                    print(f"  ❌ Validation failed for event {i} – skipping.")
                    validation_failed_count += 1
                else:
                    print(f"  ❌ Unknown issue with event {i} – skipping.")
                    validation_failed_count += 1
                continue
            # Address from schools table if location matches
            if cleaned['location_name'] and school_id:
                school_res = self.supabase.table('schools').select('name,address').eq('id', school_id).single().execute()
                if school_res.data and cleaned['location_name'].lower() == school_res.data['name'].lower():
                    cleaned['address'] = school_res.data['address']
            # Insert transaction
            print(f"  💾 Attempting to insert event: {cleaned['name']}")
            inserted = self._insert_transaction(cleaned, profile_id, school_id, post_id, caption_id)
            if inserted:
                print(f"  ✅ Successfully inserted: {cleaned['name']}")
            else:
                print(f"  ❌ Failed to insert: {cleaned['name']}")
            success_any = success_any or inserted
        
        # Print validation summary
        total_skipped = past_count + validation_failed_count
        if total_skipped > 0:
            summary_parts = []
            if past_count > 0:
                summary_parts.append(f"{past_count} past events")
            if validation_failed_count > 0:
                summary_parts.append(f"{validation_failed_count} validation failures")
            print(f"📊 Validation summary: {total_skipped} events skipped ({', '.join(summary_parts)})")
        
        return success_any

    def process_post(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single post through the complete extraction pipeline."""
        print(f"Processing post from @{post_data.get('profiles', {}).get('username', 'unknown')}")
        
        # Prepare request for Groq
        request_data = self.prepare_groq_request(post_data)
        
        # Extract events using Groq
        extracted_data = self.extract_events_with_groq(request_data)
        
        if extracted_data:
            print(f"✅ Extraction successful! Events found: {len(extracted_data.get('events', []))}")
            print(f"📊 Extraction confidence: {extracted_data.get('extraction_confidence', 'N/A')}")
            # Print extracted events summary
            for i, event in enumerate(extracted_data.get('events', []), 1):
                print(f"  Event {i}: {event.get('name', 'Unnamed')} - {event.get('start_datetime', 'No date')}")
            
            inserted = self.validate_and_insert(extracted_data, post_data, request_data.get('posted_at'))
            if inserted:
                print("💾 ✅ Successfully inserted into database")
                # Mark post processed
                self.mark_post_processed(post_data['id'])
            else:
                print("💾 ❌ Failed to insert into database")
                
            return {
                'post_id': post_data.get('id'),
                'username': request_data['username'],
                'extraction_success': inserted,
                'extracted_data': extracted_data
            }
        else:
            print("❌ Failed to extract events - no data returned from Groq")
            return {
                'post_id': post_data.get('id'),
                'username': request_data['username'],
                'extraction_success': False,
                'extracted_data': None
            }
    
    def mark_post_processed(self, post_id: str) -> bool:
        """Mark a post as processed in the database."""
        try:
            result = self.supabase.table('posts').update({'processed': True}).eq('id', post_id).execute()
            return bool(result.data)
        except Exception as e:
            print(f"Error marking post {post_id} as processed: {e}")
            return False
    
    def get_rate_limit_stats(self) -> Dict[str, Any]:
        """Get current rate limiting statistics."""
        return self.rate_limiter.get_usage_stats()
    
    def update_rate_limits(self, rpm_limit: int = None, rpd_limit: int = None, tpm_limit: int = None):
        """
        Update Groq API rate limits when they change.
        
        Args:
            rpm_limit: New requests per minute limit
            rpd_limit: New requests per day limit
            tpm_limit: New tokens per minute limit
        """
        self.rate_limiter.update_limits(rpm_limit, rpd_limit, tpm_limit)
    
    def reset_rate_limit_tracking(self):
        """Reset rate limiting usage tracking. Use with caution."""
        self.rate_limiter.reset_usage()

    def run_extraction_batch(self, batch_size: int = None) -> List[Dict[str, Any]]:
        """Run event extraction on all unprocessed posts (or limited batch if specified)."""
        if batch_size:
            print(f"🚀 Starting event extraction batch (size: {batch_size})")
        else:
            print("🚀 Starting event extraction for all unprocessed posts")
        
        # Show initial rate limit stats
        stats = self.get_rate_limit_stats()
        print(f"📊 Starting rate limit usage:")
        print(f"   RPM: {stats['requests_per_minute']['current']}/{stats['requests_per_minute']['threshold']} ({stats['requests_per_minute']['percentage']}%)")
        print(f"   RPD: {stats['requests_per_day']['current']}/{stats['requests_per_day']['threshold']} ({stats['requests_per_day']['percentage']}%)")
        print(f"   TPM: {stats['tokens_per_minute']['current']}/{stats['tokens_per_minute']['threshold']} ({stats['tokens_per_minute']['percentage']}%)")
        
        # Fetch unprocessed posts
        posts = self.fetch_unprocessed_posts(batch_size)
        
        if not posts:
            print("ℹ️  No unprocessed posts found")
            return []
        
        print(f"📊 Found {len(posts)} unprocessed posts")
        
        results = []
        for i, post in enumerate(posts, 1):
            try:
                print(f"\n📝 Processing post {i}/{len(posts)} from @{post.get('profiles', {}).get('username', 'unknown')}")
                
                # Process the post
                result = self.process_post(post)
                results.append(result)
                
                # Mark as processed if extraction was successful
                if result['extraction_success']:
                    self.mark_post_processed(post['id'])
                    
                # Show updated rate limit stats every 5 posts
                if i % 5 == 0:
                    stats = self.get_rate_limit_stats()
                    print(f"📊 Current usage after {i} posts:")
                    print(f"   RPM: {stats['requests_per_minute']['current']}/{stats['requests_per_minute']['threshold']} ({stats['requests_per_minute']['percentage']}%)")
                    print(f"   TPM: {stats['tokens_per_minute']['current']}/{stats['tokens_per_minute']['threshold']} ({stats['tokens_per_minute']['percentage']}%)")
                    
            except Exception as e:
                print(f"Error processing post {post.get('id')}: {e}")
                results.append({
                    'post_id': post.get('id'),
                    'username': post.get('profiles', {}).get('username', 'unknown'),
                    'extraction_success': False,
                    'error': str(e)
                })
        
        # Show final rate limit stats
        final_stats = self.get_rate_limit_stats()
        print(f"\n📊 Final rate limit usage:")
        print(f"   RPM: {final_stats['requests_per_minute']['current']}/{final_stats['requests_per_minute']['threshold']} ({final_stats['requests_per_minute']['percentage']}%)")
        print(f"   RPD: {final_stats['requests_per_day']['current']}/{final_stats['requests_per_day']['threshold']} ({final_stats['requests_per_day']['percentage']}%)")
        print(f"   TPM: {final_stats['tokens_per_minute']['current']}/{final_stats['tokens_per_minute']['threshold']} ({final_stats['tokens_per_minute']['percentage']}%)")
        
        print(f"🏁 Batch complete. Processed {len(results)} posts")
        return results

def main():
    """
    Main function to run the event extraction with integrated rate limiting.
    
    Usage examples:
    
    # Run on all unprocessed posts
    python ai.py
    
    # Run on specific batch size
    python ai.py 10
    
    # Programmatic usage with rate limit management:
    extractor = EventExtractor()
    
    # Check current usage
    stats = extractor.get_rate_limit_stats()
    
    # Update limits if Groq changes their API limits
    extractor.update_rate_limits(rpm_limit=1200, rpd_limit=600000, tpm_limit=350000)
    
    # Reset tracking if needed (use with caution)
    # extractor.reset_rate_limit_tracking()
    """
    try:
        extractor = EventExtractor()
        
        # Get batch size from command line args or default to all posts (None)
        batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else None
        
        # Run extraction with automatic rate limiting
        results = extractor.run_extraction_batch(batch_size)
        
        # Print summary
        successful = sum(1 for r in results if r['extraction_success'])
        print(f"\n📈 Summary: {successful}/{len(results)} posts successfully processed")
        
        # Return results for potential use by calling scripts
        return results
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
