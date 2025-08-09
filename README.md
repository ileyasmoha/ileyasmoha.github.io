# PLR Drop Product Extractor

This repository contains tools to extract and view all products from the theplrdrop.me store.

## Features

- **Web Interface**: Interactive HTML page for product extraction
- **Node.js Scraper**: Server-side script for automated extraction  
- **Multiple Methods**: Fallback options when automatic extraction fails
- **Export Options**: Download products as JSON

## Usage Methods

### Method 1: Web Interface (Recommended)

1. Open `index.html` in your browser
2. Click "Extract Products" to automatically fetch products
3. If automatic extraction fails, follow the manual instructions provided
4. Download the results as JSON using the "Download JSON" button

### Method 2: Node.js Scraper

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the scraper:
   ```bash
   npm start
   # or
   node scraper.js
   ```

3. Check the generated JSON file for results

### Method 3: Manual Browser Console

1. Visit [theplrdrop.me](https://theplrdrop.me)
2. Open browser developer tools (F12)
3. Go to the Console tab
4. Paste and run the extraction code provided in the web interface

## Files

- `index.html` - Interactive web interface for product extraction
- `scraper.js` - Node.js scraper script
- `package.json` - Dependencies for Node.js scraper

## Output Format

Products are extracted in the following JSON format:

```json
{
  "extractedAt": "2024-01-01T00:00:00.000Z",
  "source": "https://theplrdrop.me",
  "totalProducts": 10,
  "products": [
    {
      "title": "Product Name",
      "price": "$29.99",
      "link": "https://theplrdrop.me/product/example",
      "description": "Product description...",
      "extractedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## Troubleshooting

If automatic extraction fails:

1. **CORS Issues**: Use the manual browser console method
2. **JavaScript Required**: The Node.js scraper includes Puppeteer for JavaScript-heavy sites
3. **Network Issues**: Check your internet connection and try again
4. **Site Changes**: The website structure may have changed; update selectors in the code

## Technical Details

The extractor uses multiple strategies:

1. **Direct HTTP requests** with various headers
2. **CORS proxies** for cross-origin requests
3. **Puppeteer** for JavaScript-rendered content
4. **Multiple CSS selectors** to find products
5. **Fallback parsing** for alternative content structures

## License

MIT License - See the code for more details.