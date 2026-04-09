const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const host = process.env.REACT_APP_API_HOST || 'localhost';
  const port = process.env.REACT_APP_API_PORT || '4000';

  app.use(
    createProxyMiddleware(["/api"], {
      target: `http://${host}:${port}`,
      changeOrigin: true
    })
  );
};

