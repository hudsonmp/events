#!/usr/bin/env python3

import os
import re
import time
from typing import Optional, Set
from urllib.parse import urlparse

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Page, BrowserContext
from supabase import create_client, Client


def get_env_var(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return val


def get_username_from_url(url: str) -> Optional[str]:
    try:
        path = urlparse(url).path.strip('/')
        # Expecting paths like: username/ or username
        if not path:
            return None
        username = path.split('/')[0]
        # Basic Instagram username sanity check
        return username if re.fullmatch(r"[A-Za-z0-9._]+", username) else None
    except Exception:
        return None


def locate_bio_text(page: Page) -> Optional[str]:
    # Try to expand bio if a 'more' button exists near the bio
    try:
        more_btn = page.locator('span._ap3a:has-text("more")').first
        if more_btn.count():
            more_btn.click(timeout=1500)
            time.sleep(0.3)
    except Exception:
        pass

    # Primary selector (class-based; best-effort)
    try:
        span = page.locator('span._ap3a._aaco._aacu._aacx._aad7._aade').first
        if span.count():
            txt = span.inner_text(timeout=1500).strip()
            if txt:
                return txt
    except Exception:
        pass

    # Fallback: grab first visible span in the bio area heuristically
    try:
        bio = page.locator('section main span[dir="auto"]').first
        if bio.count():
            txt = bio.inner_text(timeout=1500).strip()
            if txt:
                return txt
    except Exception:
        pass
    return None


def locate_display_name(page: Page) -> Optional[str]:
    # Try common spots for the profile display name
    for sel in [
        'span.x1lliihq.x1plvlek.xryxfnj.x1n2onr6.xyejjpt.x15dsfln.x193iq5w.xeuugli.x1fj9vlw.x13faqbe.x1vvkbs.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x1i0vuye.xvs91rp.x1s688f.x5n08af.x10wh9bi.xpm28yp.x8viiok.x1o7cslx',
        'header h1',
        'section main h1',
        'section main span[dir="auto"]:nth-of-type(1)'
    ]:
        try:
            el = page.locator(sel).first
            if el.count():
                txt = el.inner_text(timeout=1500).strip()
                if txt:
                    return txt
        except Exception:
            continue
    return None


def locate_profile_pic_url(page: Page) -> Optional[str]:
    # Prefer the profile picture in the header
    try:
        img = page.locator('header img').first
        if img.count():
            src = img.get_attribute('src')
            if src and 'cdninstagram.com' in src:
                return src
    except Exception:
        pass
    # Fallback: any large image with alt ending in "profile picture"
    try:
        img = page.locator('img[alt$="profile picture"]').first
        if img.count():
            src = img.get_attribute('src')
            if src:
                return src
    except Exception:
        pass
    return None


def process_profile(context: BrowserContext, supabase: Client, profile_href: str) -> None:
    base = 'https://www.instagram.com'
    url = base + profile_href if profile_href.startswith('/') else profile_href

    page = None
    try:
        page = context.new_page()
        page.goto(url, timeout=30000)  # Reduced timeout
        page.wait_for_load_state('domcontentloaded')
    except Exception as e:
        print(f"Error navigating to {url}: {e}")
        if page:
            page.close()
        return

    try:
        username = get_username_from_url(page.url) or ''
        if not username:
            return

        # Bio gate: must include 'phhs' (case-insensitive) or skip forever
        bio = locate_bio_text(page) or ''
        if 'phhs' not in bio.lower():
            try:
                supabase.table('students').upsert({
                    'username': username,
                    'name': None,
                    'profile_pic_url': None,
                    'processed': True,
                }, on_conflict='username').execute()
            except Exception:
                pass
            return

        # Capture display name (optional)
        display_name = locate_display_name(page)

        # Capture profile picture and save to storage
        pfp_url = locate_profile_pic_url(page)
        stored_pfp_url = None
        if pfp_url:
            try:
                resp = context.request.get(pfp_url)
                if resp.ok:
                    img_bytes = resp.body()
                    filename = f"{username}.jpg"
                    # Try upload; ignore if already exists
                    try:
                        supabase.storage.from_('instagram-pfp').upload(
                            filename,
                            img_bytes,
                            file_options={"content-type": "image/jpeg"}
                        )
                        # Generate public URL for the uploaded file
                        stored_pfp_url = supabase.storage.from_('instagram-pfp').get_public_url(filename)
                    except Exception:
                        # If file exists, attempt overwrite via update()
                        try:
                            supabase.storage.from_('instagram-pfp').update(
                                filename,
                                img_bytes,
                                file_options={"content-type": "image/jpeg"}
                            )
                            # Generate public URL for the updated file
                            stored_pfp_url = supabase.storage.from_('instagram-pfp').get_public_url(filename)
                        except Exception:
                            pass
            except Exception as e:
                print(f"Error processing profile picture for {username}: {e}")

        # Save to students (processed = true)
        try:
            supabase.table('students').upsert({
                'username': username,
                'name': display_name,
                'profile_pic_url': stored_pfp_url,
                'processed': True,
            }, on_conflict='username').execute()
        except Exception:
            # Fallback: insert or update
            try:
                supabase.table('students').insert({
                    'username': username,
                    'name': display_name,
                    'profile_pic_url': stored_pfp_url,
                    'processed': True,
                }).execute()
            except Exception:
                try:
                    supabase.table('students').update({
                        'name': display_name,
                        'profile_pic_url': stored_pfp_url,
                        'processed': True,
                    }).eq('username', username).execute()
                except Exception:
                    pass
    except Exception as e:
        print(f"Error processing profile {profile_href}: {e}")
    finally:
        if page:
            try:
                page.close()
            except Exception:
                pass


def main() -> None:
    load_dotenv()

    # Supabase (no hardcoding)
    supabase_url = get_env_var('SUPABASE_PROJECT_URL')
    supabase_key = get_env_var('SUPABASE_SERVICE_ROLE')
    supabase: Client = create_client(supabase_url, supabase_key)

    COOKIES = os.path.join(os.path.dirname(__file__), 'files', 'instagram_cookies.json')
    if not os.path.exists(COOKIES):
        raise FileNotFoundError(f"Cookies file not found: {COOKIES}")

    headless_env = os.getenv('HEADLESS', 'true').lower()
    headless = False if headless_env in ('0', 'false', 'no') else True
    batch_env = os.getenv('BATCH_TARGET')
    try:
        batch_target = int(batch_env) if batch_env else 4200
    except ValueError:
        batch_target = 4200

    with sync_playwright() as p:
        print(f"Launching browser (headless={headless})…")
        
        # Launch with anti-detection settings
        browser = p.chromium.launch(
            headless=headless,
            args=[
                '--no-first-run',
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        )
        
        # Create context with realistic settings
        context = browser.new_context(
            storage_state=COOKIES,
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        # Open Instagram
        print("Opening Instagram…")
        page.goto('https://www.instagram.com/', timeout=60000)
        page.wait_for_load_state('domcontentloaded')

        # Try direct navigation first (more reliable)
        print("Navigating directly to pathenryasb profile…")
        try:
            page.goto('https://www.instagram.com/pathenryasb/', timeout=30000)
            page.wait_for_load_state('domcontentloaded')
            print("✅ Direct navigation successful")
        except Exception as e:
            print(f"❌ Direct navigation failed: {e}")
            print("Trying search method as fallback…")
            
            try:
                # Search method fallback
                page.locator('svg[aria-label="Search"]').first.click(timeout=10000)
                search_input = page.locator('input[aria-label="Search input"]').first
                search_input.fill('pathenryasb')
                time.sleep(2.0)  # Longer wait for search results
                
                # Try multiple result selectors
                clicked = False
                for selector in [
                    'a[href*="/pathenryasb/"]',
                    'div:has-text("pathenryasb") a',
                    'span:has-text("pathenryasb")'
                ]:
                    try:
                        element = page.locator(selector).first
                        if element.count():
                            element.click(timeout=5000)
                            clicked = True
                            break
                    except Exception:
                        continue
                
                if not clicked:
                    print("❌ Could not find pathenryasb in search results")
                    browser.close()
                    return
                    
            except Exception as search_error:
                print(f"❌ Search method also failed: {search_error}")
                browser.close()
                return

        page.wait_for_load_state('domcontentloaded')

        # Open followers list
        print("Opening followers…")
        try:
            # Try multiple selectors for followers link (most specific first)
            followers_clicked = False
            selectors = [
                # Most specific - the exact span you provided
                'span.x1lliihq.x1plvlek.xryxfnj.x1n2onr6:has-text("followers")',
                # Fallback selectors
                'span:has-text("followers")',
                'a[href$="/followers/"]',
                'a[href*="/followers/"]', 
                'a:has-text("followers")',
                # Very generic fallback
                '*:has-text("followers")'
            ]
            
            for selector in selectors:
                try:
                    element = page.locator(selector).first
                    if element.count():
                        print(f"✅ Found followers element with selector: {selector}")
                        element.click(timeout=5000)
                        followers_clicked = True
                        break
                except Exception as e:
                    print(f"❌ Selector '{selector}' failed: {e}")
                    continue
            
            if not followers_clicked:
                print("❌ Could not find followers link with any selector")
                browser.close()
                return
        except Exception as e:
            print(f"❌ Error opening followers: {e}")
            browser.close()
            return

        # Process followers: collect batch, scroll, repeat (simple strategy)
        processed: Set[str] = set()
        print(f"Processing up to {batch_target} followers…")

        # Wait for followers dialog to appear
        time.sleep(2.0)
        
        no_new_followers_count = 0
        max_no_new_followers = 5  # Stop if no new followers found for 5 iterations
        
        while len(processed) < batch_target and no_new_followers_count < max_no_new_followers:
            # Try different selectors for the dialog
            dialog = None
            for dialog_selector in [
                'div[role="dialog"]',
                'div[aria-labelledby]',
                'div:has-text("Followers")'
            ]:
                try:
                    dialog_candidate = page.locator(dialog_selector).first
                    if dialog_candidate.count():
                        dialog = dialog_candidate
                        break
                except Exception:
                    continue
            
            if not dialog:
                print("❌ Could not find followers dialog")
                break

            # Grab visible follower profile links with multiple selectors
            hrefs = []
            for link_selector in [
                'a[href^="/"][role="link"]',
                'a[href^="/"]',
                'a[href*="/"][role="link"]'
            ]:
                try:
                    links = dialog.locator(link_selector).all()
                    for a in links:
                        try:
                            href = a.get_attribute('href') or ''
                            # Match Instagram username patterns
                            if re.fullmatch(r"/[A-Za-z0-9._]+/?", href or ''):
                                hrefs.append(href.rstrip('/') + '/')
                        except Exception:
                            continue
                except Exception:
                    continue

            # Deduplicate while preserving order
            seen = set()
            unique_hrefs = [h for h in hrefs if not (h in seen or seen.add(h))]
            
            print(f"Found {len(unique_hrefs)} profile links in this batch")
            
            if not unique_hrefs:
                no_new_followers_count += 1
                print(f"No new followers found (attempt {no_new_followers_count}/{max_no_new_followers})")
            else:
                no_new_followers_count = 0

            # Process new ones
            new_in_batch = 0
            for href in unique_hrefs:
                uname = href.strip('/').split('/')[0]
                if uname in processed:
                    continue
                processed.add(uname)
                new_in_batch += 1
                print(f"- {len(processed)}: {uname}")
                process_profile(context, supabase, href)
                # Small delay to prevent overwhelming the system
                time.sleep(0.5)
                if len(processed) >= batch_target:
                    break
            
            print(f"Processed {new_in_batch} new profiles in this batch")

            # Scroll the followers dialog to load more
            try:
                if dialog:
                    dialog.hover()
                    page.mouse.wheel(0, 3000)
                    time.sleep(2.0)  # Longer wait for content to load
                else:
                    page.mouse.wheel(0, 3000)
                    time.sleep(2.0)
            except Exception as e:
                print(f"Error scrolling: {e}")
                break

        print(f"Done. Processed {len(processed)} followers.")
        browser.close()


if __name__ == '__main__':
    main()


