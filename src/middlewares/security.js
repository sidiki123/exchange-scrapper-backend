// src/middlewares/security.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Configuration du rate limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard'
  }
});

// Ajouter ces middlewares dans app.js
const securityMiddleware = [
  helmet(), // Sécurité des headers HTTP
  limiter,  // Rate limiting
  (req, res, next) => {
    // Headers de sécurité supplémentaires
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  }
];

module.exports = securityMiddleware;