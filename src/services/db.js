// src/services/databaseService.js
const sqlite3 = require('sqlite3').verbose();
const logger = require('../utils/logger');

class DatabaseService {
  constructor() {
    // Connexion à la base de données SQLite
    this.db = new sqlite3.Database('exchange_rates.db', (err) => {
      if (err) {
        logger.error('Erreur de connexion à la base de données:', err);
      } else {
        logger.info('Connecté à la base de données SQLite');
        // Initialiser la base de données
        this.initDatabase();
      }
    });
  }

  /**
   * Initialise la base de données et crée la table si elle n'existe pas
   */
  async initDatabase() {
    const sql = `
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Identifiant unique
        service TEXT NOT NULL,                 -- Nom du service (Gandyam, TapTapSend)
        from_currency TEXT NOT NULL,           -- Devise source (EUR, USD, etc.)
        to_currency TEXT NOT NULL,             -- Devise cible (XAF, etc.)
        rate REAL NOT NULL,                    -- Taux de change
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP  -- Horodatage
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          logger.error('Erreur lors de la création de la table:', err);
          reject(err);
        } else {
          logger.info('Table exchange_rates créée ou déjà existante');
          resolve();
        }
      });
    });
  }

  /**
   * Sauvegarde les nouveaux taux dans la base de données
   */
  async saveRates(rates) {
    const sql = `
      INSERT INTO exchange_rates (service, from_currency, to_currency, rate)
      VALUES (?, ?, ?, ?)
    `;

    // Créer un tableau de promesses pour chaque insertion
    const promises = rates.map(rate => {
      return new Promise((resolve, reject) => {
        this.db.run(sql, [
          rate.service,
          rate.from_currency,
          rate.to_currency,
          rate.rate
        ], function(err) {  // Utiliser function() pour avoir accès à this.lastID
          if (err) {
            logger.error('Erreur lors de l\'insertion:', err);
            reject(err);
          } else {
            logger.info(`Nouveau taux inséré avec l'ID: ${this.lastID}`);
            resolve(this.lastID);
          }
        });
      });
    });

    // Attendre que toutes les insertions soient terminées
    return Promise.all(promises);
  }

  /**
   * Récupère les derniers taux enregistrés
   */
  async getLatestRates() {
    const sql = `
      SELECT service, from_currency, to_currency, rate, timestamp
      FROM exchange_rates
      WHERE timestamp = (
        SELECT MAX(timestamp)
        FROM exchange_rates
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          logger.error('Erreur lors de la récupération des taux:', err);
          reject(err);
        } else {
          logger.info(`${rows.length} taux récupérés`);
          resolve(rows);
        }
      });
    });
  }

  /**
   * Méthode utilitaire pour obtenir l'historique des taux
   * (utile pour des fonctionnalités futures)
   */
  async getRatesHistory(service, limit = 10) {
    const sql = `
      SELECT *
      FROM exchange_rates
      WHERE service = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(sql, [service, limit], (err, rows) => {
        if (err) {
          logger.error('Erreur lors de la récupération de l\'historique:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

// Exporter une instance unique du service
module.exports = new DatabaseService();