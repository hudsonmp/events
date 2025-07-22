#!/usr/bin/env python3
"""
Supabase Storage Module
Handles all Supabase database operations and storage bucket uploads.
Manages profile updates, post storage, and deduplication.
"""

import os
import logging
import requests
import io
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import urlparse
import uuid

from supabase import create_client, Client
from supabase.client import ClientOptions

# Configure logging
logger = logging.getLogger(__name__)

class SupabaseStore:
    """Handles all Supabase database and storage operations"""
    
    def __init__(self):
        # Load Supabase credentials from environment
        self.url = os.getenv('SUPABASE_PROJECT_URL')
        self.key = os.getenv('SUPABASE_SERVICE_ROLE')  # Using service role for full access
        
        if not self.url or not self.key:
            raise ValueError("Supabase credentials not found in environment variables")
        
        # Initialize Supabase client
        self.client: Client = create_client(self.url, self.key)
        
        # Storage bucket names
        self.profiles_bucket = "instagram_profiles"
        self.posts_bucket = "instagram_posts"
        
        logger.info("Supabase client initialized successfully")
    
    def get_active_profiles(self) -> List[Dict[str, Any]]:
        """Get all active profiles from the database"""
        try:
            response = self.client.table('profiles').select('*').execute()
            profiles = response.data
            
            logger.info(f"Retrieved {len(profiles)} active profiles")
            return profiles
            
        except Exception as e:
            logger.error(f"Error fetching active profiles: {str(e)}")
            raise
    
    def upsert_profile(self, profile_id: str, profile_data) -> bool:
        """Update profile information and handle profile picture changes"""
        try:
            # Get current profile data
            current_profile = self.client.table('profiles').select('*').eq('id', profile_id).execute()
            
            if not current_profile.data:
                logger.error(f"Profile {profile_id} not found")
                return False
            
            current_data = current_profile.data[0]
            username = current_data['username']
            current_pfp_url = current_data.get('profile_pic_url', '')
            
            # Check if profile picture has changed
            new_pfp_url = profile_data.profile_pic_url
            pfp_updated = False
            
            if new_pfp_url != current_pfp_url:
                logger.info(f"Profile picture changed for {username}, updating...")
                
                # Upload new profile picture
                pfp_storage_path = f"{username}/profile.jpg"
                
                if self._upload_image_from_url(new_pfp_url, self.profiles_bucket, pfp_storage_path):
                    pfp_updated = True
                    logger.info(f"Profile picture updated for {username}")
                else:
                    logger.warning(f"Failed to upload new profile picture for {username}")
                    new_pfp_url = current_pfp_url  # Keep old URL if upload fails
            
            # Update profile data
            update_data = {
                'bio': profile_data.bio,
                'followers': profile_data.followers,
                'full_name': profile_data.full_name,
                'is_verified': profile_data.is_verified,
                'is_private': profile_data.is_private,
                'mediacount': profile_data.mediacount,
                'last_updated': datetime.utcnow().isoformat()
            }
            
            # Only update profile_pic_url if it changed
            if pfp_updated:
                update_data['profile_pic_url'] = new_pfp_url
            
            # Update database
            self.client.table('profiles').update(update_data).eq('id', profile_id).execute()
            
            logger.info(f"Profile data updated for {username}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating profile {profile_id}: {str(e)}")
            return False
    
    def upsert_posts(self, username_id: str, posts_data: List) -> bool:
        """Store new posts with deduplication"""
        try:
            if not posts_data:
                return True
            
            # Get username for logging
            profile_response = self.client.table('profiles').select('username').eq('id', username_id).execute()
            username = profile_response.data[0]['username'] if profile_response.data else 'unknown'
            
            successful_posts = 0
            
            for post_data in posts_data:
                try:
                    # Check if post already exists
                    existing_post = self.client.table('posts').select('id').eq('shortcode', post_data.shortcode).execute()
                    
                    if existing_post.data:
                        logger.debug(f"Post {post_data.shortcode} already exists, skipping")
                        continue
                    
                    # Upload caption
                    caption_path = f"{post_data.shortcode}/caption.txt"
                    caption_uploaded = self._upload_text_content(
                        post_data.caption or "",
                        self.posts_bucket,
                        caption_path
                    )
                    
                    if not caption_uploaded:
                        logger.warning(f"Failed to upload caption for post {post_data.shortcode}")
                        caption_path = None
                    
                    # Upload images
                    image_paths = []
                    for i, image_url in enumerate(post_data.image_urls, 1):
                        image_path = f"{post_data.shortcode}/image_{i}.jpg"
                        
                        if self._upload_image_from_url(image_url, self.posts_bucket, image_path):
                            image_paths.append(image_path)
                        else:
                            logger.warning(f"Failed to upload image {i} for post {post_data.shortcode}")
                    
                    # Skip post if no images were uploaded successfully
                    if not image_paths:
                        logger.warning(f"No images uploaded for post {post_data.shortcode}, skipping")
                        continue
                    
                    # Insert post record
                    post_insert_data = {
                        'shortcode': post_data.shortcode,
                        'username_id': username_id,
                        'caption_path': caption_path,
                        'posted_at': post_data.posted_at.isoformat(),
                        'processed': False
                    }
                    
                    post_response = self.client.table('posts').insert(post_insert_data).execute()
                    
                    if not post_response.data:
                        logger.error(f"Failed to insert post {post_data.shortcode}")
                        continue
                    
                    post_id = post_response.data[0]['id']
                    
                    # Insert post images
                    for image_path in image_paths:
                        image_insert_data = {
                            'post_id': post_id,
                            'file_path': image_path
                        }
                        
                        self.client.table('post_images').insert(image_insert_data).execute()
                    
                    successful_posts += 1
                    logger.debug(f"Successfully stored post {post_data.shortcode} with {len(image_paths)} images")
                    
                except Exception as e:
                    logger.error(f"Error processing post {post_data.shortcode}: {str(e)}")
                    continue
            
            logger.info(f"Successfully stored {successful_posts}/{len(posts_data)} posts for {username}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing posts for username_id {username_id}: {str(e)}")
            return False
    
    def update_last_seen_shortcode(self, profile_id: str, shortcode: str) -> bool:
        """Update the last seen shortcode for a profile"""
        try:
            self.client.table('profiles').update({
                'last_seen_shortcode': shortcode,
                'last_updated': datetime.utcnow().isoformat()
            }).eq('id', profile_id).execute()
            
            logger.debug(f"Updated last_seen_shortcode to {shortcode} for profile {profile_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating last_seen_shortcode for {profile_id}: {str(e)}")
            return False
    
    def _upload_image_from_url(self, image_url: str, bucket: str, storage_path: str) -> bool:
        """Download image from URL and upload to Supabase storage"""
        try:
            # Download image
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Upload to storage
            self.client.storage.from_(bucket).upload(
                storage_path,
                response.content,
                file_options={"content-type": "image/jpeg", "upsert": "true"}
            )
            
            logger.debug(f"Image uploaded to {bucket}/{storage_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error uploading image from {image_url} to {bucket}/{storage_path}: {str(e)}")
            return False
    
    def _upload_text_content(self, content: str, bucket: str, storage_path: str) -> bool:
        """Upload text content to Supabase storage"""
        try:
            # Convert string to bytes
            content_bytes = content.encode('utf-8')
            
            # Upload to storage
            self.client.storage.from_(bucket).upload(
                storage_path,
                content_bytes,
                file_options={"content-type": "text/plain", "upsert": "true"}
            )
            
            logger.debug(f"Text content uploaded to {bucket}/{storage_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error uploading text content to {bucket}/{storage_path}: {str(e)}")
            return False
    
    def _create_storage_buckets(self):
        """Create storage buckets if they don't exist"""
        buckets = [self.profiles_bucket, self.posts_bucket]
        
        for bucket in buckets:
            try:
                # Try to create bucket
                self.client.storage.create_bucket(bucket)
                logger.info(f"Created storage bucket: {bucket}")
                
            except Exception as e:
                # Bucket might already exist
                logger.debug(f"Bucket {bucket} creation failed (might already exist): {str(e)}")
    
    def verify_connection(self) -> bool:
        """Verify connection to Supabase"""
        try:
            # Try a simple query
            response = self.client.table('profiles').select('count').execute()
            logger.info("Supabase connection verified")
            return True
            
        except Exception as e:
            logger.error(f"Supabase connection failed: {str(e)}")
            return False 