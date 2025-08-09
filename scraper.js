#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class ThePlrDropScraper {
    constructor() {
        this.baseUrl = 'https://theplrdrop.me';
        this.products = [];
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    async scrapeProducts() {
        console.log('🚀 Starting product extraction from theplrdrop.me...');
        
        try {
            // Method 1: Try direct HTTP request
            let html = await this.fetchPage(this.baseUrl);
            
            if (!html) {
                console.log('❌ Direct fetch failed, trying with different headers...');
                html = await this.fetchWithHeaders(this.baseUrl);
            }
            
            if (!html) {
                console.log('❌ HTTP methods failed, trying Puppeteer...');
                html = await this.fetchWithPuppeteer(this.baseUrl);
            }
            
            if (!html) {
                throw new Error('Unable to fetch page content');
            }
            
            console.log('✅ Page content retrieved, parsing products...');
            this.parseProducts(html);
            
            if (this.products.length === 0) {
                console.log('🔍 No products found with primary selectors, trying alternative methods...');
                this.parseWithAlternativeSelectors(html);
            }
            
            return this.products;
            
        } catch (error) {
            console.error('❌ Error scraping products:', error.message);
            return [];
        }
    }

    async fetchPage(url) {
        try {
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                }
            });
            return response.data;
        } catch (error) {
            console.log(`Failed to fetch ${url}:`, error.message);
            return null;
        }
    }

    async fetchWithHeaders(url) {
        try {
            const response = await axios.get(url, {
                timeout: 20000,
                headers: {
                    'User-Agent': this.userAgent,
                    'Referer': 'https://google.com',
                    'Accept': '*/*',
                    'Cache-Control': 'no-cache'
                },
                maxRedirects: 5
            });
            return response.data;
        } catch (error) {
            console.log('Enhanced headers fetch failed:', error.message);
            return null;
        }
    }

    async fetchWithPuppeteer(url) {
        try {
            const puppeteer = require('puppeteer');
            const browser = await puppeteer.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            
            await page.setUserAgent(this.userAgent);
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            const html = await page.content();
            await browser.close();
            
            return html;
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                console.log('Puppeteer not available, skipping browser-based extraction');
            } else {
                console.log('Puppeteer fetch failed:', error.message);
            }
            return null;
        }
    }

    parseProducts(html) {
        const $ = cheerio.load(html);
        
        // Common product selectors for e-commerce sites
        const productSelectors = [
            '.product',
            '.product-item',
            '.shop-item',
            '.product-card',
            '.woocommerce-product',
            '[data-product]',
            '.product-list-item',
            '.item',
            '.listing',
            '.card'
        ];

        for (const selector of productSelectors) {
            const elements = $(selector);
            if (elements.length > 0) {
                console.log(`📦 Found ${elements.length} products using selector: ${selector}`);
                
                elements.each((index, element) => {
                    const product = this.extractProductInfo($, element, index);
                    if (product && product.title !== 'N/A') {
                        this.products.push(product);
                    }
                });
                
                if (this.products.length > 0) break;
            }
        }
    }

    parseWithAlternativeSelectors(html) {
        const $ = cheerio.load(html);
        
        // Try to find any links that might be products
        const links = $('a[href*="product"], a[href*="shop"], a[href*="buy"], a[href*="item"]');
        
        if (links.length > 0) {
            console.log(`🔗 Found ${links.length} potential product links`);
            
            links.each((index, element) => {
                const $el = $(element);
                const href = $el.attr('href');
                const text = $el.text().trim();
                
                if (text && href && text.length > 3) {
                    this.products.push({
                        title: text,
                        price: 'Price not available',
                        link: this.resolveUrl(href),
                        description: '',
                        extractedAt: new Date().toISOString(),
                        method: 'link-extraction'
                    });
                }
            });
        }
        
        // Try to find any elements with price-like text
        const priceElements = $('*').filter((i, el) => {
            const text = $(el).text();
            return /\$\d+|\d+\.\d{2}|USD|EUR|GBP/i.test(text);
        });
        
        if (priceElements.length > 0) {
            console.log(`💰 Found ${priceElements.length} elements with price-like content`);
        }
    }

    extractProductInfo($, element, index) {
        const $el = $(element);
        
        // Extract title
        const titleSelectors = [
            '.product-title',
            '.title',
            '.name',
            'h1', 'h2', 'h3', 'h4',
            '.product-name',
            '[data-title]'
        ];
        
        let title = 'N/A';
        for (const selector of titleSelectors) {
            const titleEl = $el.find(selector).first();
            if (titleEl.length && titleEl.text().trim()) {
                title = titleEl.text().trim();
                break;
            }
        }
        
        // If no title found in children, try the element itself
        if (title === 'N/A') {
            const elementText = $el.text().trim();
            if (elementText && elementText.length < 200) {
                title = elementText.split('\n')[0].trim();
            }
        }
        
        // Extract price
        const priceSelectors = [
            '.price',
            '.cost',
            '.amount',
            '.product-price',
            '[data-price]'
        ];
        
        let price = 'Price not available';
        for (const selector of priceSelectors) {
            const priceEl = $el.find(selector).first();
            if (priceEl.length && priceEl.text().trim()) {
                price = priceEl.text().trim();
                break;
            }
        }
        
        // Extract link
        let link = '#';
        const linkEl = $el.find('a').first();
        if (linkEl.length) {
            link = this.resolveUrl(linkEl.attr('href'));
        } else if ($el.is('a')) {
            link = this.resolveUrl($el.attr('href'));
        }
        
        // Extract description
        const descSelectors = [
            '.description',
            '.product-description',
            '.excerpt',
            'p'
        ];
        
        let description = '';
        for (const selector of descSelectors) {
            const descEl = $el.find(selector).first();
            if (descEl.length && descEl.text().trim()) {
                description = descEl.text().trim();
                if (description.length > 500) {
                    description = description.substring(0, 500) + '...';
                }
                break;
            }
        }
        
        return {
            title,
            price,
            link,
            description,
            extractedAt: new Date().toISOString(),
            extractionIndex: index
        };
    }

    resolveUrl(href) {
        if (!href) return '#';
        if (href.startsWith('http')) return href;
        if (href.startsWith('//')) return 'https:' + href;
        if (href.startsWith('/')) return this.baseUrl + href;
        return this.baseUrl + '/' + href;
    }

    async saveProducts(filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().split('T')[0];
            filename = `theplrdrop-products-${timestamp}.json`;
        }
        
        const data = {
            extractedAt: new Date().toISOString(),
            source: this.baseUrl,
            totalProducts: this.products.length,
            products: this.products
        };
        
        try {
            fs.writeFileSync(filename, JSON.stringify(data, null, 2));
            console.log(`💾 Products saved to ${filename}`);
            return filename;
        } catch (error) {
            console.error('❌ Error saving products:', error.message);
            return null;
        }
    }

    printSummary() {
        console.log('\n📊 Extraction Summary:');
        console.log(`Total products found: ${this.products.length}`);
        
        if (this.products.length > 0) {
            console.log('\n📋 Product List:');
            this.products.forEach((product, index) => {
                console.log(`${index + 1}. ${product.title}`);
                console.log(`   Price: ${product.price}`);
                console.log(`   Link: ${product.link}`);
                if (product.description) {
                    console.log(`   Description: ${product.description.substring(0, 100)}...`);
                }
                console.log('');
            });
        }
    }
}

// Main execution
async function main() {
    const scraper = new ThePlrDropScraper();
    
    console.log('🎯 PLR Drop Product Scraper');
    console.log('================================\n');
    
    const products = await scraper.scrapeProducts();
    
    if (products.length > 0) {
        await scraper.saveProducts();
        scraper.printSummary();
        
        console.log('\n✅ Scraping completed successfully!');
        console.log('📄 Check the generated JSON file for full product data.');
    } else {
        console.log('\n❌ No products found.');
        console.log('This could be due to:');
        console.log('- The website structure has changed');
        console.log('- The site requires JavaScript to load products');
        console.log('- Network connectivity issues');
        console.log('- The site has anti-scraping measures');
        console.log('\nTry using the web interface (index.html) for manual extraction.');
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ThePlrDropScraper;