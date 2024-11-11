const puppeteer = require('puppeteer');
const logger = require('../../utils/logger');

class BaseScraper {
  async initBrowser() {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920x1080',
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    page.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    return { browser, page };
  }

  isValidRate(rate) {
    return rate >= 400 && rate <= 500;
  }

  formatResult(rate, fees, serviceName) {
    return {
      service: serviceName,
      from_currency: 'CAD',
      to_currency: 'XOF',
      rate: parseFloat(rate),
      fees: parseFloat(fees || 0),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = BaseScraper;