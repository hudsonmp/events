#!/usr/bin/env python3
"""
Instagram Scraper Module
Handles all Instagram API interactions using Instagrapi.
Provides methods to fetch profile information and stream posts.
"""

import os
import logging
import time
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from instagrapi import Client
from instagrapi.exceptions import (
    LoginRequired, 
    PleaseWaitFewMinutes, 
    RateLimitError,
    UserNotFound,
    PrivateError,
    ClientError
)

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class PostData:
    """Data class for Instagram post information"""
    shortcode: str
    posted_at: datetime
    caption: str
    image_urls: List[str]

@dataclass
class ProfileData:
    """Data class for Instagram profile information"""
    profile_pic_url: str
    bio: str
    followers: int
    full_name: str
    is_verified: bool
    is_private: bool
    mediacount: int

class InstagramScraper:
    """Handles Instagram API interactions via Instagrapi"""
    
    def __init__(self):
        self.client = Client()
        self.authenticated = False
        self.one_month_ago = datetime.now() - timedelta(days=30)
        
        # Load credentials from environment
        self.username = os.getenv('INSTAGRAM_USERNAME')
        self.password = os.getenv('INSTAGRAM_PASSWORD')
        
        if not self.username or not self.password:
            raise ValueError("Instagram credentials not found in environment variables")
        
        # Setup session persistence
        self.session_file = "instagram_session.json"
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Instagram using stored session or credentials"""
        try:
            # Try to load existing session
            if os.path.exists(self.session_file):
                logger.info("Loading existing Instagram session...")
                self.client.load_settings(self.session_file)
                self.client.login(self.username, self.password)
                logger.info("Successfully loaded existing session")
            else:
                logger.info("Creating new Instagram session...")
                self.client.login(self.username, self.password)
                self.client.dump_settings(self.session_file)
                logger.info("Successfully created new session")
            
            self.authenticated = True
            
        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            # Clean up session file if authentication fails
            if os.path.exists(self.session_file):
                os.remove(self.session_file)
            raise
    
    def _handle_rate_limit(self, attempt: int = 1, max_attempts: int = 3):
        """Handle rate limiting with exponential backoff"""
        if attempt > max_attempts:
            raise RateLimitError("Max rate limit attempts exceeded")
        
        wait_time = (2 ** attempt) * 60 + random.uniform(0, 30)  # Exponential backoff with jitter
        logger.warning(f"Rate limited. Waiting {wait_time:.1f} seconds (attempt {attempt}/{max_attempts})")
        time.sleep(wait_time)
    
    def _safe_api_call(self, func, *args, **kwargs):
        """Safely execute API calls with error handling and retries"""
        max_attempts = 3
        
        for attempt in range(1, max_attempts + 1):
            try:
                return func(*args, **kwargs)
                
            except (PleaseWaitFewMinutes, RateLimitError) as e:
                logger.warning(f"Rate limit hit: {str(e)}")
                self._handle_rate_limit(attempt, max_attempts)
                if attempt == max_attempts:
                    raise
                continue
                
            except LoginRequired:
                logger.warning("Login required, re-authenticating...")
                self._authenticate()
                continue
                
            except (UserNotFound, PrivateError) as e:
                logger.error(f"User access error: {str(e)}")
                return None
                
            except ClientError as e:
                logger.error(f"Client error: {str(e)}")
                if attempt == max_attempts:
                    raise
                time.sleep(random.uniform(5, 15))
                continue
                
            except Exception as e:
                logger.error(f"Unexpected error: {str(e)}")
                if attempt == max_attempts:
                    raise
                time.sleep(random.uniform(5, 15))
                continue
        
        return None
    
    def fetch_profile(self, username: str) -> Optional[ProfileData]:
        """Fetch profile information for a given username"""
        logger.info(f"Fetching profile info for {username}")
        
        try:
            # Remove @ symbol if present
            username = username.lstrip('@')
            
            user_info = self._safe_api_call(self.client.user_info_by_username, username)
            
            if not user_info:
                logger.warning(f"Could not fetch user info for {username}")
                return None
            
            profile_data = ProfileData(
                profile_pic_url=user_info.profile_pic_url,
                bio=user_info.biography or "",
                followers=user_info.follower_count,
                full_name=user_info.full_name or "",
                is_verified=user_info.is_verified,
                is_private=user_info.is_private,
                mediacount=user_info.media_count
            )
            
            logger.info(f"Successfully fetched profile for {username}")
            return profile_data
            
        except Exception as e:
            logger.error(f"Error fetching profile for {username}: {str(e)}")
            return None
    
    def stream_posts(self, username: str, stop_at_shortcode: Optional[str] = None) -> List[PostData]:
        """Stream posts from a user, newest first, stopping at a specific shortcode"""
        logger.info(f"Streaming posts for {username}")
        
        try:
            # Remove @ symbol if present
            username = username.lstrip('@')
            
            # Get user ID first
            user_info = self._safe_api_call(self.client.user_info_by_username, username)
            if not user_info:
                logger.warning(f"Could not get user info for {username}")
                return []
            
            user_id = user_info.pk
            
            # Get user's media
            medias = self._safe_api_call(self.client.user_medias, user_id, amount=50)
            
            if not medias:
                logger.warning(f"No medias found for {username}")
                return []
            
            new_posts = []
            
            for media in medias:
                try:
                    # Check if we've reached the stop point
                    if stop_at_shortcode and media.code == stop_at_shortcode:
                        logger.info(f"Reached stop shortcode {stop_at_shortcode} for {username}")
                        break
                    
                    # Skip posts older than one month
                    if media.taken_at < self.one_month_ago:
                        logger.info(f"Reached one month limit for {username}")
                        break
                    
                    # Extract image URLs (skip videos)
                    image_urls = []
                    
                    if media.media_type == 1:  # Single image
                        image_urls.append(media.thumbnail_url)
                    elif media.media_type == 8:  # Carousel
                        for resource in media.resources:
                            if resource.media_type == 1:  # Only images, skip videos
                                image_urls.append(resource.thumbnail_url)
                    
                    # Skip if no images found
                    if not image_urls:
                        logger.debug(f"No images found for post {media.code}, skipping")
                        continue
                    
                    post_data = PostData(
                        shortcode=media.code,
                        posted_at=media.taken_at,
                        caption=media.caption_text or "",
                        image_urls=image_urls
                    )
                    
                    new_posts.append(post_data)
                    
                    logger.debug(f"Added post {media.code} for {username}")
                    
                    # Small delay between posts
                    time.sleep(random.uniform(0.5, 2.0))
                    
                except Exception as e:
                    logger.error(f"Error processing post {media.code if hasattr(media, 'code') else 'unknown'}: {str(e)}")
                    continue
            
            logger.info(f"Found {len(new_posts)} new posts for {username}")
            return new_posts
            
        except Exception as e:
            logger.error(f"Error streaming posts for {username}: {str(e)}")
            return []
    
    def __del__(self):
        """Cleanup when scraper is destroyed"""
        if hasattr(self, 'client') and self.client:
            try:
                self.client.logout()
            except:
                pass  # Ignore logout errors 