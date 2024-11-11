const path = require('path');

module.exports = {
  development: {
    storage: path.join(__dirname, '../../exchange_rates.db'),
    dialect: 'sqlite',
    logging: false
  },
  production: {
    storage: path.join(__dirname, '../../exchange_rates.db'),
    dialect: 'sqlite',
    logging: false
  }
};