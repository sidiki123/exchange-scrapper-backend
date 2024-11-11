const BaseScraper = require('./base-scrapper');
const logger = require('../../utils/logger');

class TapTapSendScraper extends BaseScraper {
  async getRates() {
    let browser = null;
    try {
      logger.info('🚀 Début du scraping TapTapSend...');
      logger.info('⌛ Initialisation du navigateur...');
      const { browser: newBrowser, page } = await this.initBrowser();
      browser = newBrowser;
      logger.info('✅ Navigateur initialisé');

      logger.info('📄 Navigation vers taptapsend.com...');
      await page.goto('https://www.taptapsend.com', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      logger.info('✅ Page chargée');

      logger.info('🔍 Recherche du sélecteur pays source...');
      await page.waitForSelector('#origin-currency', { timeout: 30000 });
      
      logger.info('🍁 Sélection du Canada (CA-CAD)...');
      await page.evaluate(() => {
        const select = document.querySelector('#origin-currency');
        const canadaOption = Array.from(select.options).find(
          option => option.value === 'CA-CAD'
        );
        if (canadaOption) {
          select.value = canadaOption.value;
          select.dispatchEvent(new Event('change'));
        }
      });
      await page.delay(3000);
      
      const selectedOrigin = await page.evaluate(() => {
        const select = document.querySelector('#origin-currency');
        return select.options[select.selectedIndex].text;
      });
      logger.info('✅ Pays source sélectionné:', selectedOrigin);

      // Sélectionner le Burkina Faso
      logger.info('🔍 Recherche du sélecteur de destination...');
      await page.waitForSelector('#destination-currency', { timeout: 30000 });
      
      logger.info('🎯 Sélection du Burkina Faso (BF-XOF)...');
      await page.evaluate(() => {
        const select = document.querySelector('#destination-currency');
        const bfOption = Array.from(select.options).find(
          option => option.value === 'BF-XOF'
        );
        if (bfOption) {
          select.value = bfOption.value;
          select.dispatchEvent(new Event('change'));
        }
      });
      await page.delay(3000);

      // Vérifier la sélection de destination
      const selectedDest = await page.evaluate(() => {
        const select = document.querySelector('#destination-currency');
        return select.options[select.selectedIndex].text;
      });
      logger.info('✅ Destination sélectionnée:', selectedDest);

      // Attendre l'affichage du taux
      logger.info('⏳ Attente de l\'affichage du taux...');
      await page.waitForSelector('#fxRateText', { timeout: 30000 });

      // Debug de l'élément de taux
      const rateElementInfo = await page.evaluate(() => {
        const element = document.querySelector('#fxRateText');
        return {
          exists: !!element,
          text: element ? element.textContent : null,
          visible: element ? window.getComputedStyle(element).display !== 'none' : false,
          html: element ? element.outerHTML : null
        };
      });
      logger.info('📊 Info élément taux:', rateElementInfo);

      // Extraction du taux
      logger.info('🔄 Extraction du taux de change...');
      const { rate, fees } = await page.evaluate(() => {
        try {
          const rateElement = document.querySelector('#fxRateText');
          const feesElement = document.querySelector('#feeText');
          
          console.log('Texte du taux brut:', rateElement?.textContent);
          
          if (!rateElement) {
            console.log('❌ Élément taux non trouvé');
            return { rate: null, fees: null };
          }

          const rateText = rateElement.textContent.trim();
          const feesText = feesElement ? feesElement.textContent.trim() : '';
          
          console.log('Texte du taux nettoyé:', rateText);
          console.log('Texte des frais:', feesText);

          const rateMatch = rateText.match(/CAD 1 = ([\d.,]+) FCFA/) || 
                          rateText.match(/1 CAD = ([\d.,]+) FCFA/) ||
                          rateText.match(/([\d.,]+) FCFA/);
                          
          const feesMatch = feesText.match(/([\d.,]+) CAD/);

          console.log('Match taux:', rateMatch?.[1]);
          console.log('Match frais:', feesMatch?.[1]);

          return {
            rate: rateMatch ? parseFloat(rateMatch[1].replace(',', '.')) : null,
            fees: feesMatch ? parseFloat(feesMatch[1].replace(',', '.')) : 0
          };
        } catch (err) {
          console.error('❌ Erreur extraction:', err);
          return { rate: null, fees: null };
        }
      });

      logger.info('📊 Valeurs extraites:', { rate, fees });

      if (!rate) {
        logger.warn('⚠️ Aucun taux trouvé');
        await this.captureScreenshot(page, 'taptapsend_no_rate');
        return null;
      }

      logger.info(`✅ Taux trouvé: ${rate} FCFA pour 1 CAD`);

      const result = this.formatResult(rate, fees, 'TapTapSend');
      logger.info('✅ Résultat final:', result);
      return result;

    } catch (error) {
      logger.error('❌ Erreur TapTapSend:', {
        message: error.message,
        stack: error.stack
      });
      if (browser) {
        const page = (await browser.pages())[0];
        await this.captureScreenshot(page, 'taptapsend_error');
      }
      return null;
    } finally {
      if (browser) {
        logger.info('🔒 Fermeture du navigateur');
        await browser.close();
      }
    }
  }

  async captureScreenshot(page, name) {
    try {
      const path = `logs/taptapsend/debug_${name}_${Date.now()}.png`;
      await page.screenshot({ path, fullPage: true });
      logger.info(`📸 Screenshot sauvegardé: ${path}`);
    } catch (err) {
      logger.error('❌ Erreur capture screenshot:', err);
    }
  }
}

module.exports = TapTapSendScraper;