from pathlib import Path
from playwright.sync_api import sync_playwright

STORAGE_STATE = Path(__file__).resolve().parent / "files" / "instagram_cookies.json"
INSTAGRAM_URL = "https://www.instagram.com/"


def main() -> None:
    """Open Instagram with the saved storage state to verify login."""
    if not STORAGE_STATE.exists():
        raise FileNotFoundError(
            f"Storage state file not found: {STORAGE_STATE}. Run save_instagram_cookies.py first."
        )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(storage_state=str(STORAGE_STATE))
        page = context.new_page()

        print("Opening Instagram with stored session…")
        page.goto(INSTAGRAM_URL)

        # Give some time to load/feed. Adjust as needed.
        page.wait_for_timeout(20_000)  # 20 seconds

        print("If you see your feed/profile, cookies are working!")
        browser.close()


if __name__ == "__main__":
    main()
