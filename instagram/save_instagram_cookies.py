from pathlib import Path
import json
from playwright.sync_api import sync_playwright

OUTPUT_FILE = Path(__file__).resolve().parent / "files" / "instagram_cookies.json"
LOGIN_URL = "https://www.instagram.com/accounts/login/"
TIMEOUT_MS = 60_000  # 60 seconds to log in manually


def main() -> None:
    """Launch a browser for manual Instagram login and save session cookies."""
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        print("Opening Instagram login page…")
        page.goto(LOGIN_URL)
        print(
            "Please complete the login within 60 seconds. "
            "The window will close automatically when done."
        )

        # Wait for the user to finish logging in.
        page.wait_for_timeout(TIMEOUT_MS)

        # Save storage state (cookies + localStorage, etc.)
        state = context.storage_state()
        with OUTPUT_FILE.open("w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

        # Simple validation: warn if sessionid cookie is missing.
        if not any(c["name"] == "sessionid" for c in state["cookies"]):
            print("Warning: sessionid cookie not found. Login may have failed.")
        else:
            print("Successfully saved Instagram session to", OUTPUT_FILE)

        browser.close()


if __name__ == "__main__":
    main()
