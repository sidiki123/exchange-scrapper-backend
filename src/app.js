// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ScrapingService = require('./services/scrapper');
const databaseService = require('./services/db');
const logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Middleware de logging des requêtes
app.use((req, res, next) => {
  logger.info(`📝 ${req.method} ${req.url}`);
  next();
});

// Middleware de gestion des réponses
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Routes
class RouteHandler {
  static async getTest(req, res) {
    res.json({
      status: 'success',
      message: 'API fonctionnelle',
      timestamp: new Date().toISOString()
    });
  }

  static async testScraper(req, res) {
    const scraper = new ScrapingService();
    const results = await scraper.scrapeAllRates();
    
    if (!results || results.length === 0) {
      return res.status(404).json({
        status: 'warning',
        message: 'Aucun taux trouvé',
        results: []
      });
    }

    res.json({
      status: 'success',
      results
    });
  }

  static async testDatabase(req, res) {
    const rates = await databaseService.getLatestRates();
    
    if (!rates || rates.length === 0) {
      return res.status(404).json({
        status: 'warning',
        message: 'Aucun taux en base de données',
        rates: []
      });
    }

    res.json({
      status: 'success',
      rates
    });
  }

  static async getRates(req, res) {
    const rates = await databaseService.getLatestRates();
    
    if (!rates || rates.length === 0) {
      return res.status(404).json({
        status: 'warning',
        message: 'Aucun taux disponible',
        rates: []
      });
    }

    const formattedRates = rates.map(rate => ({
      service: rate.service,
      from_currency: rate.from_currency,
      to_currency: rate.to_currency,
      rate: parseFloat(rate.rate),
      fees: parseFloat(rate.fees || 0),
      timestamp: rate.timestamp,
    }));

    res.json({
      status: 'success',
      rates: formattedRates
    });
  }

  static async refreshRates(req, res) {
    const scraper = new ScrapingService();
    const newRates = await scraper.scrapeAllRates();

    if (!newRates || newRates.length === 0) {
      return res.status(404).json({
        status: 'warning',
        message: 'Aucun nouveau taux trouvé',
        rates: []
      });
    }

    // Sauvegarder les nouveaux taux
    await databaseService.saveRates(newRates);

    // Récupérer tous les taux mis à jour
    const allRates = await databaseService.getLatestRates();

    res.json({
      status: 'success',
      message: `${newRates.length} taux mis à jour`,
      rates: allRates
    });
  }
}

// Définition des routes
app.get('/test', asyncHandler(RouteHandler.getTest));
app.get('/test-scraper', asyncHandler(RouteHandler.testScraper));
app.get('/test-db', asyncHandler(RouteHandler.testDatabase));
app.get('/api/taux', asyncHandler(RouteHandler.getRates));
app.post('/api/taux/refresh', asyncHandler(RouteHandler.refreshRates));

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  logger.error('❌ Erreur:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Une erreur inattendue est survenue',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Démarrage du serveur
const server = app.listen(port, () => {
  logger.info(`
🚀 Serveur démarré sur le port ${port}

📍 Routes disponibles:
  GET  /test          - Test de l'API
  GET  /test-scraper  - Test du scraper
  GET  /test-db       - Test de la base de données
  GET  /api/taux      - Obtenir les taux actuels
  POST /api/taux/refresh - Rafraîchir les taux
  `);
});

// Gestion gracieuse de l'arrêt
const handleShutdown = async (signal) => {
  logger.info(`Signal ${signal} reçu. Arrêt gracieux...`);
  
  try {
    // Fermer la connexion à la base de données si nécessaire
    if (databaseService.disconnect) {
      await databaseService.disconnect();
    }

    server.close(() => {
      logger.info('✅ Serveur arrêté proprement');
      process.exit(0);
    });

    // Forcer l'arrêt après 5 secondes si la fermeture gracieuse échoue
    setTimeout(() => {
      logger.error('❌ Arrêt forcé après timeout');
      process.exit(1);
    }, 5000);

  } catch (error) {
    logger.error('❌ Erreur lors de l\'arrêt:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promesse rejetée non gérée:', {
    reason,
    promise
  });
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Exception non gérée:', error);
  handleShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = app;