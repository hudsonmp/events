from flask import Flask, render_template, request, jsonify
import asyncio
import json
from instagram_advanced_scraper import InstagramAdvancedScraper
import threading
import time

app = Flask(__name__)

# Global variable to store scraping results
scraping_results = {}
scraping_status = {"running": False, "message": ""}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scrape', methods=['POST'])
def scrape():
    global scraping_status, scraping_results
    
    data = request.get_json()
    username = data.get('username', '').strip()
    max_posts = int(data.get('max_posts', 5))
    days_back = int(data.get('days_back', 30))
    
    if not username:
        return jsonify({"error": "Username is required"})
    
    # Start scraping in background thread
    scraping_status = {"running": True, "message": f"Scraping @{username}..."}
    
    def run_scraper():
        global scraping_results, scraping_status
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            scraper = InstagramAdvancedScraper()
            result = loop.run_until_complete(
                scraper.scrape_account(username, max_posts, days_back)
            )
            
            scraping_results = result
            scraping_status = {"running": False, "message": "Scraping completed!"}
            
        except Exception as e:
            scraping_results = {"error": str(e), "success": False}
            scraping_status = {"running": False, "message": f"Error: {str(e)}"}
    
    thread = threading.Thread(target=run_scraper)
    thread.start()
    
    return jsonify({"message": "Scraping started"})

@app.route('/status')
def status():
    return jsonify({
        "status": scraping_status,
        "results": scraping_results
    })

@app.route('/results')
def results():
    return jsonify(scraping_results)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 