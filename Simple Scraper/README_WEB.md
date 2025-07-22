# Instagram Post Scraper - Web Application

A modern web interface for scraping Instagram posts with customizable parameters.

## Features

- 🎯 **Configurable Parameters**: Set number of posts and timeframe
- 🖼️ **Image Display**: View post images directly in the browser
- 📝 **Caption Extraction**: See post captions and content
- ⏰ **Timestamp Data**: Get exact posting times
- 🎨 **Modern UI**: Beautiful, responsive design
- ⚡ **Real-time Status**: Live updates during scraping

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Install Playwright browsers:
```bash
python -m playwright install
```

## Usage

### Running the Web Application

1. Start the Flask server:
```bash
python app.py
```

2. Open your browser and go to:
```
http://localhost:5000
```

### Using the Interface

1. **Enter Username**: Type an Instagram username (without @)
2. **Set Parameters**:
   - **Maximum Posts**: Choose 1, 3, 5, or 10 posts
   - **Timeframe**: Select how many days back to look (7 days to 5 years)
3. **Click "Start Scraping"**: The scraper will run in the background
4. **View Results**: Posts will display in a beautiful card layout

### Example Output

The scraper returns:
- **Post Images**: Direct links to Instagram images
- **Captions**: Full post text content
- **Timestamps**: Exact posting dates and times
- **Post URLs**: Direct links to Instagram posts
- **Days Ago**: How many days ago each post was made

### Timeframe Options

- **7 days**: Recent posts only
- **14 days**: Last two weeks
- **30 days**: Last month (default)
- **60 days**: Last two months
- **90 days**: Last three months
- **6 months**: Last half year
- **1 year**: Last year
- **2 years**: Last two years
- **3 years**: Last three years
- **5 years**: Last five years

## Files

- `app.py` - Flask web application
- `instagram_advanced_scraper.py` - Advanced scraper with multiple post support
- `templates/index.html` - Modern web interface
- `requirements.txt` - Python dependencies

## Technical Details

- **Backend**: Flask with async Playwright scraping
- **Frontend**: Modern HTML/CSS/JavaScript
- **Real-time Updates**: AJAX polling for status updates
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Graceful error display and recovery

## Limitations

- Instagram may block automated access with frequent use
- Some accounts may be private and inaccessible
- Rate limiting may occur with multiple requests
- Image URLs may expire over time

## Troubleshooting

### Common Issues

1. **"Profile not found"**: Account may be private or doesn't exist
2. **"No posts found"**: Account has no posts in the specified timeframe
3. **"Scraping failed"**: Instagram may be blocking the request

### Solutions

- Try with different usernames
- Reduce the number of posts requested
- Wait a few minutes between scraping attempts
- Use public Instagram accounts for testing

## Development

To modify the scraper:
- Edit `instagram_advanced_scraper.py` for scraping logic
- Edit `templates/index.html` for UI changes
- Edit `app.py` for backend functionality

The web interface makes it easy to test and use the Instagram scraper with a beautiful, user-friendly interface!