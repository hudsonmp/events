import os
import json
import base64
from io import BytesIO
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv
import requests
from groq import Groq
from copy import deepcopy

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_PROJECT_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Groq client
groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key)

# System prompt for event detection
SYSTEM_PROMPT = """You are an expert at evaluating whether an Instagram post is refrencing our criteria: an upcomming event, deadline, meeting, or speific opportunity. Then, if it matches our criteria, you extract metadata from that Instagram post performing sentiment analysis to attatch relevant category tags to the event, and outputting a JSON file if you determine it fits our criteria. If a post is either irrelevant (ie; not an event) or recounting an event, you should return {"status": "NO_EVENT", "reason": "irrelevant"} for irrelevant posts or {"status": "NO_EVENT", "reason": "past_event"} for posts recounting past events. However, if the post fits our criteria, you must return a JSON file including as much of the following metadata as possible. There can be one-to-many relationships and be sure to infer information as needed. If the post caption refrences a bio, ensure you use the bio as a potential source of truth as well. You will be evaluating whether a post meets our criteria by analyzing the caption and post images(s)."""

# Pre-load the event extraction JSON schema so we can pass it to Groq for structured output
event_schema_path = os.path.join(os.path.dirname(__file__), "event_extraction_schema.json")
with open(event_schema_path, "r", encoding="utf-8") as _schema_file:
    EVENT_EXTRACTION_SCHEMA = json.load(_schema_file)

# Create a relaxed copy of the schema to prevent Groq validation errors.
RELAXED_SCHEMA = deepcopy(EVENT_EXTRACTION_SCHEMA)
# 1. Allow non-ISO text like "today" by removing strict date-time format requirements.
if "format" in RELAXED_SCHEMA["properties"].get("start_datetime", {}):
    RELAXED_SCHEMA["properties"]["start_datetime"].pop("format")
if "format" in RELAXED_SCHEMA["properties"].get("end_datetime", {}):
    RELAXED_SCHEMA["properties"]["end_datetime"].pop("format")
# 2. Accept a single string or an array for categories.
RELAXED_SCHEMA["properties"]["categories"] = {
    "type": ["array", "string"],
    "description": RELAXED_SCHEMA["properties"]["categories"]["description"],
    "items": RELAXED_SCHEMA["properties"]["categories"].get("items"),
}

# We'll use RELAXED_SCHEMA when calling Groq tools.

def fetch_unprocessed_post() -> Optional[Dict[str, Any]]:
    """Fetch the first unprocessed post from the database."""
    try:
        result = supabase.table('posts').select('*').eq('processed', False).limit(1).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        print(f"❌ Error fetching unprocessed post: {e}")
        return None

def get_profile_info(username_id: str) -> Optional[Dict[str, Any]]:
    """Get profile information using username_id foreign key."""
    try:
        result = supabase.table('profiles').select('*').eq('id', username_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception as e:
        print(f"❌ Error fetching profile info: {e}")
        return None

def get_post_images(post_id: str) -> List[str]:
    """Get all image file paths for a specific post."""
    try:
        result = supabase.table('post_images').select('file_path').eq('post_id', post_id).execute()
        if result.data:
            return [row['file_path'] for row in result.data]
        return []
    except Exception as e:
        print(f"❌ Error fetching post images: {e}")
        return []

def download_file_from_storage(bucket_name: str, file_path: str) -> Optional[bytes]:
    """Download file from Supabase storage bucket."""
    try:
        result = supabase.storage.from_(bucket_name).download(file_path)
        return result
    except Exception as e:
        print(f"❌ Error downloading {file_path} from {bucket_name}: {e}")
        return None

def download_text_file_from_storage(bucket_name: str, file_path: str) -> Optional[str]:
    """Download text file from Supabase storage bucket and return as string."""
    try:
        file_data = download_file_from_storage(bucket_name, file_path)
        if file_data:
            return file_data.decode('utf-8')
        return None
    except Exception as e:
        print(f"❌ Error decoding text file {file_path}: {e}")
        return None

def encode_image_to_base64(image_data: bytes) -> str:
    """Encode image data to base64 string."""
    return base64.b64encode(image_data).decode('utf-8')

def send_to_groq(post_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Send post data to Groq API for event detection using structured output."""
    try:
        # Build the base messages array with our system prompt
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        # Compose user content (caption, bio, username, images)
        user_content: List[Dict[str, Any]] = []

        if post_data.get("caption"):
            user_content.append({"type": "text", "text": f"Post Caption: {post_data['caption']}"})

        if post_data.get("bio"):
            user_content.append({"type": "text", "text": f"User Bio: {post_data['bio']}"})

        # Always include the username for extra context
        user_content.append({"type": "text", "text": f"Username: {post_data['username']}"})

        # Attach images if we have them available
        for image_b64 in post_data.get("images", [])[:3]: # Limit to first 3 images
            user_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
            })

        messages.append({"role": "user", "content": user_content})

        # Define the structured output instructions for the model (OpenAI-compatible tool calling)
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "extract_event",
                    "description": "Extract event details from an Instagram post. Only call this function if the post meets the event criteria.",
                    "parameters": RELAXED_SCHEMA, # Use RELAXED_SCHEMA here
                },
            }
        ]

        # Send to Groq with tools attached so the model can return structured data
        response = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=messages,
            tools=tools,
            tool_choice="auto",  # Let the model decide whether or not to call the tool
            temperature=0.1,
            max_tokens=1200,
        )

        # Handle tool responses first – this is where the structured output lives
        choice = response.choices[0]
        message = choice.message

        # Case 1: The model called the function, so we parse arguments
        tool_calls = getattr(message, "tool_calls", None)
        if tool_calls:
            # We only expect one tool call
            arguments_json = tool_calls[0].function.arguments if hasattr(tool_calls[0].function, "arguments") else None
            if isinstance(arguments_json, str):
                try:
                    return json.loads(arguments_json)
                except json.JSONDecodeError:
                    print(f"❌ Failed to decode tool arguments: {arguments_json}")
                    return None

        # Case 2: The model returned plain content (likely NO_EVENT JSON)
        if message and getattr(message, "content", None):
            content_str = message.content.strip()
            try:
                return json.loads(content_str)
            except json.JSONDecodeError:
                print(f"❌ Invalid JSON response from Groq: {content_str}")
                return None

        # Fallback – we didn't understand the model's response
        print("❌ Groq response did not contain usable JSON or tool calls")
        return None

    except Exception as e:
        print(f"❌ Error sending to Groq API: {e}")
        return None

def mark_post_as_processed(post_id: str) -> bool:
    """Mark a post as processed in the database."""
    try:
        result = supabase.table('posts').update({'processed': True}).eq('id', post_id).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"❌ Error marking post as processed: {e}")
        return False

def save_event_to_database(event_data: Dict[str, Any], post_id: str, profile_id: str) -> bool:
    """Persist event and its categories to Supabase following the schema relationships.

    1. Ensure each category exists in public.categories; create if necessary.
    2. Insert the event into public.events with linkage to profile & school.
    3. Create rows in public.event_categories linking the event to each category.
    """
    try:
        # 1. Handle categories first – collect their UUIDs
        category_ids: List[str] = []
        categories = event_data.get("categories", [])
        for cat_name in categories:
            # Look for existing category
            existing = supabase.table("categories").select("id").eq("name", cat_name).limit(1).execute()
            if existing.data:
                category_ids.append(existing.data[0]["id"])
            else:
                inserted = supabase.table("categories").insert({"name": cat_name}).execute()
                if not inserted.data:
                    print(f"❌ Failed to insert category {cat_name}")
                    continue
                category_ids.append(inserted.data[0]["id"])

        # 2. Insert the event itself
        SCHOOL_ID_CONSTANT = "00000000-0000-0000-0000-000000000001"
        event_row = {
            "name": event_data.get("name"),
            "start_datetime": event_data.get("start_datetime"),
            "end_datetime": event_data.get("end_datetime"),
            "school_id": SCHOOL_ID_CONSTANT,
            "address": event_data.get("address"),
            "location_name": event_data.get("location_name"),
            "description": event_data.get("description"),
            "is_all_day": event_data.get("is_all_day", False),
            "type": event_data.get("type", "in-person"),
            "profile_id": profile_id,
        }
        insert_event_resp = supabase.table("events").insert(event_row).execute()
        if not insert_event_resp.data:
            print("❌ Failed to insert event into Supabase")
            return False
        event_id = insert_event_resp.data[0]["id"]

        # 3. Link event to categories
        for cat_id in category_ids:
            supabase.table("event_categories").insert({"event_id": event_id, "category_id": cat_id}).execute()

        print(f"✅ Event {event_id} saved with {len(category_ids)} categories and linked to post {post_id}")
        return True
    except Exception as e:
        print(f"❌ Error saving event to database: {e}")
        return False

def process_single_post() -> bool:
    """Process a single unprocessed post through the AI extraction pipeline."""
    print("🔍 Fetching unprocessed post...")
    
    # Step 1: Fetch unprocessed post
    post = fetch_unprocessed_post()
    if not post:
        print("✅ No unprocessed posts found")
        return False
    
    post_id = post['id']
    shortcode = post['shortcode'] 
    username_id = post['username_id']
    
    print(f"📝 Processing post {shortcode} (ID: {post_id})")
    
    # Step 2: Get profile information
    profile = get_profile_info(username_id)
    if not profile:
        print(f"❌ Could not find profile for username_id: {username_id}")
        # mark_post_as_processed(post_id)  # Commented out for test runs
        return False
    
    username = profile['username']
    print(f"👤 Username: {username}")
    
    # Step 3: Get post images
    image_paths = get_post_images(post_id)
    print(f"🖼️  Found {len(image_paths)} images for post")
    
    # Step 4: Download images from storage
    images_b64 = []
    for image_path in image_paths[:3]:  # Limit to first 3 images to stay under API limits
        image_data = download_file_from_storage('instagram-posts', image_path)
        if image_data:
            images_b64.append(encode_image_to_base64(image_data))
            print(f"✅ Downloaded image: {image_path}")
        else:
            print(f"❌ Failed to download image: {image_path}")
    
    # Step 5: Download caption from storage
    caption = None
    caption_path = f"{username}/{shortcode}.txt"
    caption = download_text_file_from_storage('instagram-captions', caption_path)
    if caption:
        print(f"✅ Downloaded caption")
    else:
        print(f"ℹ️  No caption found for {shortcode}, proceeding with image analysis only")
    
    # Step 6: Download bio from storage  
    bio = None
    bio_path = f"{username}/{username}_bio.txt"
    bio = download_text_file_from_storage('instagram-bios', bio_path)
    if bio:
        print(f"✅ Downloaded bio")
    else:
        print(f"❌ No bio found for {username}")
    
    # Step 7: Prepare data for Groq
    post_data = {
        'shortcode': shortcode,
        'username': username,
        'caption': caption,
        'bio': bio,
        'images': images_b64
    }
    
    # Step 8: Send to Groq API
    print("🤖 Sending to Groq for analysis...")
    groq_response = send_to_groq(post_data)
    
    if not groq_response:
        print("❌ Failed to get response from Groq")
        # mark_post_as_processed(post_id)  # Commented out for test runs
        return False
    
    # Handle response
    if groq_response.get('status') == 'NO_EVENT':
        print(f"⏭️  No event detected: {groq_response.get('reason', 'unknown')}")
    else:
        print("🎉 Event detected! Saving to database...")
        save_event_to_database(groq_response, post_id, username_id)
    
    # Mark post as processed (commented out for test runs)
    # if mark_post_as_processed(post_id):
    #     print(f"✅ Post {shortcode} marked as processed")
    
    return True

def main():
    """Main function to process posts."""
    print("🚀 Starting AI extraction pipeline...")
    
    # Process one post at a time
    if process_single_post():
        print("✅ Post processing completed")
    else:
        print("ℹ️  No posts to process")

if __name__ == "__main__":
    main()