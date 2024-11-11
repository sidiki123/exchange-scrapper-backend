const TapTapSendScraper = require('./scrappers/taptapsend');
const TransfertChapChapScraper = require('./scrappers/transfertchapchap');
const logger = require('../utils/logger');

class ScrapingService {
    constructor() {
      this.scrapers = [
        new TapTapSendScraper(),
        new TransfertChapChapScraper()
      ];
    }
  
    async scrapeAllRates() {
      try {
        logger.info('🔄 Début du scraping multi-services CAD vers XOF...');
        
        const results = await Promise.all(
          this.scrapers.map(async scraper => {
            try {
              const result = await scraper.getRates();
              if (result) {
                logger.info(`✅ ${result.service}: Taux CAD/XOF - ${result.rate} (Frais: ${result.fees} CAD)`);
                return result;
              }
              return null;
            } catch (error) {
              logger.error(`❌ Erreur ${scraper.constructor.name}:`, error);
              return null;
            }
          })
        );
  
        const validRates = this.filterUniqueRates(results.filter(rate => rate !== null));
        
        logger.info(`📊 Scraping terminé: ${validRates.length} taux CAD/XOF récupérés`);
        return validRates;
  
      } catch (error) {
        logger.error('❌ Erreur scraping:', error);
        throw error;
      }
    }
  
    filterUniqueRates(rates) {
      const seen = new Set();
      return rates.filter(rate => {
        const key = `${rate.service}-${rate.from_currency}-${rate.to_currency}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  }
  
  module.exports = ScrapingService;
