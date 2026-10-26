const app = require('../server');

module.exports = (req, res) => {
  if (req.url === '/api/index' && req.originalUrl) {
    req.url = req.originalUrl;
  }
  return app(req, res);
};
