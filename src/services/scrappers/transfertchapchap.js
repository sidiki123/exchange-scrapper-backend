const logger = require('../../utils/logger');
const BaseScraper = require('./base-scrapper');

class TransfertChapChapScraper extends BaseScraper {
  async getRates() {
    let browser = null;
    try {
      logger.info('🚀 Début du scraping TransfertChapChap...');
      const { browser: newBrowser, page } = await this.initBrowser();
      browser = newBrowser;

      page.on('console', msg => logger.info('Console du navigateur:', msg.text()));

      logger.info('📄 Navigation vers transfertchapchap.com...');
      await page.goto('https://transfertchapchap.com', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      logger.info('✅ Page chargée');

      logger.info('⏳ Attente du chargement complet du formulaire...');
      await page.waitForSelector('form', { timeout: 30000 });
      
      const formElements = await page.evaluate(() => {
        const form = document.querySelector('form');
        const formFound = form ? 'oui' : 'non';
        
        const selectElements = Array.from(document.querySelectorAll('select')).map(s => ({
          id: s.id,
          name: s.name,
          options: Array.from(s.options).map(o => ({
            value: o.value,
            text: o.text
          }))
        }));

        return {
          formFound,
          selectElements
        };
      });

      logger.info('Form trouvé:', formElements.formFound);
      logger.info('Sélecteurs trouvés:', JSON.stringify(formElements.selectElements, null, 2));

      // Sélection du pays source (Canada)
      logger.info('🔄 Sélection du Canada...');
      const canadaSelected = await page.evaluate(() => {
        const sourceSelect = Array.from(document.querySelectorAll('select')).find(
          select => select.options[0]?.text.includes('Canada') || 
                   select.id.toLowerCase().includes('source') ||
                   select.name.toLowerCase().includes('source')
        );

        if (sourceSelect) {
          const canadaOption = Array.from(sourceSelect.options).find(
            option => option.text.includes('Canada')
          );
          
          if (canadaOption) {
            sourceSelect.value = canadaOption.value;
            sourceSelect.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      });

      if (!canadaSelected) {
        logger.warn('⚠️ Impossible de sélectionner le Canada');
      }

      await page.delay(3000);
      logger.info('✅ Sélection du Canada terminée');

      // Sélection du pays de destination (Burkina Faso)
      logger.info('🔄 Sélection du Burkina Faso...');
      const bfSelected = await page.evaluate(() => {
        const destSelect = Array.from(document.querySelectorAll('select')).find(
          select => select.options[0]?.text.includes('Burkina') || 
                   select.id.toLowerCase().includes('destination') ||
                   select.name.toLowerCase().includes('destination')
        );

        if (destSelect) {
          const bfOption = Array.from(destSelect.options).find(
            option => option.text.includes('Burkina')
          );
          
          if (bfOption) {
            destSelect.value = bfOption.value;
            destSelect.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        return false;
      });

      if (!bfSelected) {
        logger.warn('⚠️ Impossible de sélectionner le Burkina Faso');
      }

      await page.delay(3000);
      logger.info('✅ Sélection du Burkina Faso terminée');

      // Saisie du montant
      logger.info('💰 Saisie du montant test...');
      const amountInput = await page.$('input[type="number"], input[placeholder*="montant" i]');
      if (amountInput) {
        await amountInput.type('1');
        await amountInput.press('Enter');
        logger.info('✅ Montant saisi');
      } else {
        logger.warn('⚠️ Champ de montant non trouvé');
      }
      await page.delay(5000);

      // Attente active pour les résultats
      logger.info('🔄 Vérification des résultats...');
      let attempts = 0;
      const maxAttempts = 10;
      let rate = null;
      let fees = null;

      while (attempts < maxAttempts) {
        const textContents = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('p, span, div'))
            .map(el => ({
              text: el.textContent.trim(),
              hasCAD: el.textContent.includes('CAD'),
              hasXOF: el.textContent.includes('XOF')
            }))
            .filter(item => item.hasCAD && item.hasXOF);
        });

        logger.info(`Tentative ${attempts + 1}: Textes trouvés:`, textContents);

        for (const { text } of textContents) {
          const rateMatch = text.match(/1\s*CAD\s*=\s*([\d,.]+)\s*XOF/i) ||
                          text.match(/([\d,.]+)\s*XOF/i);
          
          if (rateMatch) {
            rate = parseFloat(rateMatch[1].replace(',', '.'));
            logger.info(`✅ Taux trouvé: ${rate}`);
            break;
          }
        }

        if (rate) break;

        logger.info(`⏳ Tentative ${attempts + 1}/${maxAttempts} - Attente des résultats...`);
        await page.delay(2000);
        attempts++;
      }

      if (!rate) {
        logger.warn('⚠️ Aucun taux trouvé après plusieurs tentatives');
        await this.captureScreenshot(page, 'no_rate_found');
        return null;
      }

      if (!this.isValidRate(rate)) {
        logger.warn(`⚠️ Taux invalide trouvé: ${rate}`);
        return null;
      }

      const result = this.formatResult(rate, fees, 'TransfertChapChap');
      logger.info('✅ Résultat final:', result);
      return result;

    } catch (error) {
      logger.error('❌ Erreur TransfertChapChap:', {
        message: error.message,
        stack: error.stack
      });
      if (browser) {
        const page = (await browser.pages())[0];
        await this.captureScreenshot(page, 'transfertchapchap_error');
      }
      return null;
    } finally {
      if (browser) {
        logger.info('🔒 Fermeture du navigateur');
        await browser.close();
      }
    }
  }

  // Méthode pour capturer des screenshots (utile pour le debug)
  async captureScreenshot(page, name) {
    try {
      const path = `logs/transfertchapchap/debug_${name}_${Date.now()}.png`;
      await page.screenshot({ path, fullPage: true });
      logger.info(`📸 Screenshot sauvegardé: ${path}`);
    } catch (err) {
      logger.error('❌ Erreur capture screenshot:', err);
    }
  }
}

module.exports = TransfertChapChapScraper;